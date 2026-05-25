import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { auth } from '@/lib/firebase-admin';
import Anthropic from '@anthropic-ai/sdk';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { scraperLimit, checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RECIPE_TOOL: Anthropic.Tool = {
    name: 'extract_recipe',
    description: 'Extract structured recipe data from webpage text.',
    input_schema: {
        type: 'object' as const,
        properties: {
            name:     { type: 'string' },
            servings: { type: 'string', description: 'e.g. "4 servings"' },
            prepTime: { type: 'string', description: 'e.g. "15 mins"' },
            cookTime: { type: 'string', description: 'e.g. "30 mins"' },
            ingredients: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        amount: { type: 'string' },
                        unit:   { type: 'string' },
                        item:   { type: 'string' },
                    },
                    required: ['amount', 'unit', 'item'],
                },
            },
            instructions: { type: 'array', items: { type: 'string' } },
            imageUrl:     { type: 'string' },
            categories:   { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'ingredients', 'instructions'],
    },
};

/** Strip noise from the cheerio document and return plain text for Claude. */
function extractPageText($: ReturnType<typeof cheerio.load>): string {
    const metaTitle = $('meta[property="og:title"]').attr('content')
        || $('meta[name="title"]').attr('content') || '';
    const metaDesc  = $('meta[property="og:description"]').attr('content')
        || $('meta[name="description"]').attr('content') || '';
    const metaImage = $('meta[property="og:image"]').attr('content') || '';

    $('script, style, noscript, iframe, nav, footer, header, aside').remove();
    $('[class*="ad-"],[id*="ad-"],[class*="cookie"],[class*="popup"],[class*="modal"],[class*="newsletter"],[class*="sidebar"],[class*="comment"],[class*="social"],[class*="share-"]').remove();

    let mainText = '';
    for (const sel of ['[itemtype*="Recipe"]', '[class*="recipe"]', 'article', 'main', '#content', '.content']) {
        const el = $(sel).first();
        if (el.length) { mainText = el.text(); break; }
    }
    if (!mainText) mainText = $('body').text();

    const parts = [
        metaTitle  ? `Title: ${metaTitle}`       : '',
        metaDesc   ? `Description: ${metaDesc}`  : '',
        metaImage  ? `Image: ${metaImage}`        : '',
        mainText,
    ].filter(Boolean).join('\n\n');

    return parts
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, 15000);
}

async function extractWithClaude($: ReturnType<typeof cheerio.load>, sourceUrl: string): Promise<Recipe> {
    const pageText = extractPageText($);

    if (pageText.length < 100) {
        throw new Error(
            'This page appears to be JavaScript-rendered and returned no readable content. ' +
            'Try a different recipe website or paste the recipe manually.'
        );
    }

    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        tools: [RECIPE_TOOL],
        tool_choice: { type: 'tool', name: 'extract_recipe' },
        messages: [{
            role: 'user',
            content: `Extract the recipe from this webpage text using the extract_recipe tool.\n\nSource URL: ${sourceUrl}\n\n${pageText}`,
        }],
    });

    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (!toolUse) {
        throw new Error('Could not extract recipe data from this page.');
    }

    const r = toolUse.input as {
        name: string; servings?: string; prepTime?: string; cookTime?: string;
        ingredients: { amount: string; unit: string; item: string }[];
        instructions: string[]; imageUrl?: string; categories?: string[];
    };

    if (!r.name || (!r.ingredients?.length && !r.instructions?.length)) {
        throw new Error('Could not find a recipe on this page. The site may require a login or block automated access.');
    }

    return {
        name:         r.name,
        servings:     r.servings  || '',
        prepTime:     r.prepTime  || '',
        cookTime:     r.cookTime  || '',
        ingredients:  r.ingredients  || [],
        instructions: r.instructions || [],
        imageUrl:     r.imageUrl,
        categories:   r.categories   || [],
        sourceUrl,
    };
}

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB

function isPrivateIP(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0' || ip === '::') return true;
  if (ip === '169.254.169.254') return true; // cloud metadata endpoint
  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 0) return true;
  }
  return false;
}

async function validateRecipeUrl(rawUrl: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs are supported.');
  }

  const hostname = parsed.hostname;
  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) throw new Error('This URL cannot be accessed.');
  } else {
    try {
      const addresses = await lookup(hostname, { all: true });
      for (const addr of addresses) {
        if (isPrivateIP(addr.address)) throw new Error('This URL cannot be accessed.');
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'This URL cannot be accessed.') throw err;
      throw new Error(
        `Could not connect to ${hostname}. The site may be blocking automated access. ` +
        'Try uploading a photo of the recipe instead (Scan a Recipe), or paste the text manually (Bulk Entry).'
      );
    }
  }

  return parsed.href;
}

// ---------------------------------------------------------------------------
// TikTok — oEmbed-based extraction
// TikTok pages are JS-rendered and return no usable HTML. The oEmbed endpoint
// exposes the video title (= caption), which often contains the full recipe.
// ---------------------------------------------------------------------------

function isTikTokUrl(url: string): boolean {
    try {
        const { hostname } = new URL(url);
        return hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com');
    } catch {
        return false;
    }
}

async function extractFromTikTok(url: string): Promise<Recipe> {
    // Short URLs (vm.tiktok.com, tiktok.com/t/) don't work with oEmbed.
    // Follow redirects first to get the canonical video URL.
    let canonicalUrl = url;
    try {
        const headRes = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Syftbot/1.0)' },
            signal: AbortSignal.timeout(8000),
        });
        if (headRes.url) canonicalUrl = headRes.url;
    } catch {
        // Fall back to the original URL
    }

    let oembedRes: Response;
    try {
        oembedRes = await fetch(
            `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`,
            {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Syftbot/1.0)' },
                signal: AbortSignal.timeout(10000),
            }
        );
    } catch {
        throw new Error(
            'Could not reach TikTok to fetch the video description. Check your connection and try again.'
        );
    }

    if (!oembedRes.ok) {
        throw new Error(
            'Could not fetch the TikTok video info. The video may be private, deleted, or unavailable.'
        );
    }

    let oembed: { title?: string; author_name?: string; thumbnail_url?: string };
    try {
        oembed = await oembedRes.json();
    } catch {
        throw new Error(
            'TikTok returned an unexpected response. The video may be private or region-restricted.'
        );
    }
    const description = oembed.title?.trim() || '';

    if (!description) {
        throw new Error(
            'This TikTok video has no caption. Add the recipe text manually using Bulk Entry.'
        );
    }

    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        tools: [RECIPE_TOOL],
        tool_choice: { type: 'tool', name: 'extract_recipe' },
        messages: [{
            role: 'user',
            content: `Extract the recipe from this TikTok video caption.\n\nCreator: @${oembed.author_name || 'unknown'}\n\nCaption:\n${description}`,
        }],
    });

    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (!toolUse) {
        throw new Error('Could not extract a recipe from this TikTok caption.');
    }

    const r = toolUse.input as {
        name: string; servings?: string; prepTime?: string; cookTime?: string;
        ingredients: { amount: string; unit: string; item: string }[];
        instructions: string[]; imageUrl?: string; categories?: string[];
    };

    if (!r.name || (!r.ingredients?.length && !r.instructions?.length)) {
        throw new Error(
            'No recipe found in this TikTok caption. The video may not contain one, or the description is too short.'
        );
    }

    return {
        name:         r.name,
        servings:     r.servings  || '',
        prepTime:     r.prepTime  || '',
        cookTime:     r.cookTime  || '',
        ingredients:  r.ingredients  || [],
        instructions: r.instructions || [],
        imageUrl:     r.imageUrl || oembed.thumbnail_url,
        categories:   r.categories   || [],
        sourceUrl:    url,
    };
}

// ---------------------------------------------------------------------------

// Sites that require a login or return nothing useful even with Claude.
// These get a clear early error rather than wasting an API call.
const BLOCKED_WEBSITES: string[] = [
    'cooking.nytimes.com',  // hard paywall + login
];

interface RecipeIngredient {
    amount: string;
    unit: string;
    item: string;
}

interface Recipe {
    name: string;
    servings: string;
    prepTime: string;
    cookTime: string;
    ingredients: RecipeIngredient[];
    instructions: string[];
    imageUrl?: string;
    categories: string[];
    sourceUrl: string;
}

interface JsonLdRecipe {
    '@type': string;
    name: string;
    recipeYield?: string | number;
    prepTime?: string;
    cookTime?: string;
    recipeIngredient: string[];
    recipeInstructions: Array<string | { '@type': string; text: string }>;
    image?: string | { url: string };
    recipeCategory?: string | string[];
}

export async function POST(request: Request) {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let userId: string;
    try {
        const decoded = await auth.verifyIdToken(token);
        userId = decoded.uid;
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitRes = await checkRateLimit(scraperLimit, userId);
    if (rateLimitRes) return rateLimitRes;

    try {
        const { url: rawUrl } = await request.json();

        // Validate URL and block SSRF
        const url = await validateRecipeUrl(rawUrl);

        // Check if the URL is from a known blocked website
        const isBlockedWebsite = BLOCKED_WEBSITES.some((domain: string) =>
            url.toLowerCase().includes(domain)
        );

        if (isBlockedWebsite) {
            throw new Error(
                `This website (${new URL(url).hostname}) is known to block automated recipe scraping. ` +
                'Please copy the recipe manually or try a different recipe website.'
            );
        }

        // TikTok pages are JS-rendered — use oEmbed to get the caption instead
        if (isTikTokUrl(url)) {
            const recipe = await extractFromTikTok(url);
            return NextResponse.json(recipe);
        }

        // Add headers to mimic a browser request
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        };

        // Fetch the webpage content with a timeout and redirect handling
        let response: Response;
        try {
            response = await fetch(url, {
                headers,
                redirect: 'follow',
                cache: 'no-store',
                signal: AbortSignal.timeout(15000),
            });
        } catch {
            throw new Error(
                `Could not connect to ${new URL(url).hostname}. The site may be blocking automated access. ` +
                'Try uploading a photo of the recipe instead (Scan a Recipe), or paste the text manually (Bulk Entry).'
            );
        }

        const contentLength = Number(response.headers.get('content-length') ?? 0);
        if (contentLength > MAX_RESPONSE_BYTES) {
            throw new Error('The page is too large to process.');
        }

        if (!response.ok) {
            throw new Error(
                `${new URL(url).hostname} returned an error (${response.status}). ` +
                'The page may require a login or be blocking automated access.'
            );
        }

        const html = await response.text();

        // Check if the response contains common blocking messages
        if (html.includes('Access Denied') ||
            html.includes('Please enable JavaScript') ||
            html.includes('bot detection') ||
            html.includes('security check') ||
            html.includes('redirect count exceeded')) {
            throw new Error(
                `${new URL(url).hostname} blocked automated access. ` +
                'Try uploading a photo of the recipe instead (Scan a Recipe), or paste the text manually (Bulk Entry).'
            );
        }

        // Load the HTML into cheerio
        const $ = cheerio.load(html);

        // Try to find recipe data in JSON-LD format first
        const jsonLd = $('script[type="application/ld+json"]').toArray()
            .map(element => {
                try {
                    return JSON.parse($(element).html() || '');
                } catch {
                    return null;
                }
            })
            .find(data => data && (
                data['@type'] === 'Recipe' || 
                (Array.isArray(data['@graph']) && data['@graph'].some((item: { '@type': string }) => item['@type'] === 'Recipe'))
            ));

        let recipeData: Recipe;

        if (jsonLd) {
            // Extract recipe from JSON-LD
            const recipe: JsonLdRecipe = Array.isArray(jsonLd['@graph']) 
                ? jsonLd['@graph'].find((item: { '@type': string }) => item['@type'] === 'Recipe')
                : jsonLd;

            // Parse ingredients
            const ingredients = recipe.recipeIngredient.map((ing: string) => {
                const parts = ing.split(' ');
                return {
                    amount: parts[0] || '',
                    unit: parts[1] || '',
                    item: parts.slice(2).join(' '),
                };
            });

            // Parse instructions
            const instructions = recipe.recipeInstructions.map(inst => 
                typeof inst === 'string' ? inst : inst.text
            );

            // Format prepTime and cookTime
            const formatTime = (timeStr: string) => {
                if (!timeStr) return '';
                // Extract numbers from ISO duration strings like 'PT15M' or 'PT1H30M'
                if (timeStr.startsWith('PT')) {
                    const hours = timeStr.match(/(\d+)H/);
                    const minutes = timeStr.match(/(\d+)M/);
                    const hoursVal = hours ? parseInt(hours[1]) : 0;
                    const minutesVal = minutes ? parseInt(minutes[1]) : 0;
                    
                    if (hoursVal > 0 && minutesVal > 0) {
                        return `${hoursVal} hr ${minutesVal} mins`;
                    } else if (hoursVal > 0) {
                        return `${hoursVal} ${hoursVal === 1 ? 'hr' : 'hrs'}`;
                    } else if (minutesVal > 0) {
                        return `${minutesVal} mins`;
                    }
                }
                return timeStr;
            };

            // Format servings to extract just the number
            const formatServings = (servingsStr: string) => {
                if (!servingsStr) return '';
                // Try to extract just the number from strings like 'Servings: 8' or 'Serves 4-6'
                const matches = servingsStr.toString().match(/\d+/g);
                return matches && matches.length > 0 ? matches[0] : servingsStr;
            };

            recipeData = {
                name: recipe.name,
                servings: formatServings(recipe.recipeYield?.toString() || ''),
                prepTime: formatTime(recipe.prepTime || ''),
                cookTime: formatTime(recipe.cookTime || ''),
                ingredients,
                instructions,
                imageUrl: typeof recipe.image === 'string' ? recipe.image : recipe.image?.url,
                categories: Array.isArray(recipe.recipeCategory) 
                    ? recipe.recipeCategory 
                    : recipe.recipeCategory ? [recipe.recipeCategory] : [],
                sourceUrl: url
            };
        } else {
            // Fallback to HTML parsing if JSON-LD is not available
            const ingredients: RecipeIngredient[] = [];
            const instructions: string[] = [];
            const categories: string[] = [];

            // Common selectors for recipe ingredients
            $('li[class*="ingredient"], .ingredient-item, .ingredients li, [class*="ingredients__item"], .mntl-structured-ingredients__list-item, [class*="recipe-ingredients"] li, [class*="recipe__ingredients"] li').each((_, el) => {
                const text = $(el).text().trim();
                const parts = text.split(' ');
                ingredients.push({
                    amount: parts[0] || '',
                    unit: parts[1] || '',
                    item: parts.slice(2).join(' '),
                });
            });

            // Common selectors for recipe instructions
            const instructionSelectors = [
                'li[class*="instruction"]', 
                '.instruction-item', 
                '.instructions li', 
                '.preparation-steps li',
                '.recipe-directions__list li',
                '.steps li',
                '.step li',
                '.mntl-sc-block-group--LI p',
                '[class*="recipe__steps"] li',
                '[class*="recipe-steps"] li',
                '[class*="recipe-instructions"] li',
                '[class*="recipesteps"] li',
                '.recipe-method-step',
                '[id*="recipe-steps"] li',
                '[id*="recipe_steps"] li',
                '[id*="recipesteps"] li',
                '[class*="recipe-directions"] li',
                '[class*="recipe__directions"] li',
                '[class*="recipe__instructions"] li',
                '.instructions-section-item',                     // AllRecipes specific
                '.recipe-directions__item',                       // AllRecipes specific
                '.recipe-directions__list--item',                 // AllRecipes specific
                '.direction-section p'                            // AllRecipes specific
            ];

            // Process each instruction selector separately
            instructionSelectors.forEach(selector => {
                $(selector).each((_, el) => {
                    // Skip if the element is or is within a figcaption
                    if (
                        $(el).is('figcaption') || 
                        $(el).parent().is('figcaption') || 
                        $(el).hasClass('image-caption') || 
                        $(el).hasClass('caption') || 
                        $(el).hasClass('figure-caption')
                    ) {
                        return;
                    }
                    
                    // Clone the element to avoid modifying the original
                    const $el = $(el).clone();
                    
                    // Remove image captions and other non-instruction content
                    $el.find('figcaption').remove();
                    $el.find('.image-caption').remove();
                    $el.find('.caption').remove();
                    $el.find('[class*="caption"]').remove();
                    $el.find('[class*="image-description"]').remove();
                    $el.find('[class*="figure-article-caption-owner"]').remove();
                    $el.find('.figure-article-caption').remove();
                    $el.find('img').remove();
                    $el.find('figure').remove();
                    $el.find('.image-container').remove();
                    $el.find('[class*="image-container"]').remove();
                    $el.find('.figure-article-image-wrapper').remove();
                    $el.find('.media-container').remove();
                    $el.find('.photo-overlay').remove();
                    $el.find('.video-container').remove();
                    
                    // Get the text content after removing unwanted elements
                    const text = $el.text().trim();
                    
                    // Skip empty text
                    if (!text) return;
                    
                    // Split the text into lines to handle multi-line content
                    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
                    
                    // Process each line and combine valid instruction parts
                    const validLines = lines.filter(line => {
                        // Skip lines that are just image credits or captions
                        if (line.match(/^[A-Z\s]+$/) || // All caps
                            line.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Food\s+Studios|Photography|Media|Group|Inc\.?|LLC|Ltd\.?)$/) || // Company names
                            line.match(/^(click|tap|view|see|image|photo|picture)/i) || // Caption starts
                            line.match(/credit\s*:|photographer\s*:/i) || // Photo credits
                            line.match(/\.(jpg|jpeg|png|gif|webp)$/i) || // Image file names
                            line.match(/photo\s+by\s+/i) || // Photo attribution
                            line.match(/pictured\s+/i) || // Caption language
                            line.match(/\d+\s+of\s+\d+/i) || // Gallery numbering (e.g., "2 of 5")
                            line.length <= 5) { // Too short
                            return false;
                        }
                        return true;
                    });

                    // Combine valid lines into a single instruction
                    const cleanText = validLines.join(' ')
                        .replace(/advertisement|sponsored|ad/gi, '')
                        .replace(/^step\s*\d+[.:]?\s*/i, '') // Remove "Step X:" prefix
                        .replace(/^\d+[.:]?\s*/i, '') // Remove number prefix
                        .replace(/\(?\s*[Cc]redit:.*$/, '') // Remove credit attributions
                        .replace(/\(?\s*[Pp]hoto:.*$/, '') // Remove photo attributions
                        .replace(/\(?\s*[Pp]ictured:.*$/, '') // Remove pictured attributions
                        .trim();
                    
                    if (cleanText && cleanText.length > 10) { // Ensure it's a substantial instruction
                        instructions.push(cleanText);
                    }
                });
            });

            // For AllRecipes specifically, we can try to extract instructions more precisely
            if (url.includes('allrecipes.com')) {
                try {
                    let foundInstructionsInSchema = false;
                    
                    // First priority: Get instructions from JSON-LD structured data
                    const scriptTags = $('script[type="application/ld+json"]');
                    scriptTags.each((_, script) => {
                        try {
                            const jsonText = $(script).html() || '';
                            if (!jsonText || foundInstructionsInSchema) return;
                            
                            // Simple check before parsing
                            if (jsonText.includes('"recipeInstructions"') || jsonText.includes('"HowToStep"')) {
                                const parsedData = JSON.parse(jsonText.replace(/\n/g, ' '));
                                
                                // Handle different JSON-LD structures
                                const getInstructionsFromData = (data: Record<string, unknown>): string[] => {
                                    const result: string[] = [];
                                    
                                    // Handle standard recipe format
                                    if (data.recipeInstructions && Array.isArray(data.recipeInstructions)) {
                                        data.recipeInstructions.forEach((inst: string | { text: string }) => {
                                            if (typeof inst === 'string') {
                                                result.push(inst);
                                            } else if (typeof inst === 'object' && inst.text) {
                                                result.push(inst.text);
                                            }
                                        });
                                    }
                                    
                                    // Check for graph array format
                                    if (data['@graph'] && Array.isArray(data['@graph'])) {
                                        data['@graph'].forEach((item: Record<string, unknown>) => {
                                            if (item['@type'] === 'Recipe' && item.recipeInstructions) {
                                                if (Array.isArray(item.recipeInstructions)) {
                                                    item.recipeInstructions.forEach((inst: string | { text: string }) => {
                                                        if (typeof inst === 'string') {
                                                            result.push(inst);
                                                        } else if (typeof inst === 'object' && inst.text) {
                                                            result.push(inst.text);
                                                        }
                                                    });
                                                }
                                            }
                                        });
                                    }
                                    
                                    return result;
                                };
                                
                                const schemaInstructions = getInstructionsFromData(parsedData);
                                
                                if (schemaInstructions.length > 0) {
                                    instructions.length = 0;
                                    schemaInstructions.forEach(text => {
                                        // Clean and add each instruction
                                        const cleanText = text
                                            .trim()
                                            .replace(/AllRecipes\s*\/\s*[\w\s]+$/i, '')
                                            .replace(/\s*Photo by[\w\s]+$/i, '')
                                            .trim();
                                            
                                        if (cleanText && cleanText.length > 10) {
                                            instructions.push(cleanText);
                                        }
                                    });
                                    foundInstructionsInSchema = true;
                                }
                            }
                        } catch (e) {
                            console.error('Error parsing AllRecipes structured data:', e);
                        }
                    });
                    
                    // Second priority: Look for specific HTML instruction blocks if structured data failed
                    if (!foundInstructionsInSchema) {
                        // Try the paragraph method which often contains complete text
                        const instructionParagraphs = $('.mntl-sc-block-html');
                        if (instructionParagraphs.length > 0) {
                            const allRecipesInstructions: string[] = [];
                            
                            instructionParagraphs.each((_, el) => {
                                const text = $(el).text().trim();
                                
                                // Only use paragraphs that look like instructions
                                if (text && 
                                    text.length > 15 && 
                                    !text.match(/AllRecipes|Photo by|\d+ of \d+/i) &&
                                    !$(el).parents('figcaption, .caption').length) {
                                    allRecipesInstructions.push(text);
                                }
                            });
                            
                            if (allRecipesInstructions.length > 0) {
                                instructions.length = 0;
                                allRecipesInstructions.forEach(text => instructions.push(text));
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error in AllRecipes specific parsing:', e);
                }
                
                // Final cleanup of instructions regardless of source
                for (let i = 0; i < instructions.length; i++) {
                    instructions[i] = instructions[i]
                        .replace(/AllRecipes\s*\/\s*[^\/\n]+/g, '')
                        .replace(/AllRecipes\s+\/?[^\/\n]*/g, '')
                        .replace(/\s*Photo by[^$]*/g, '')
                        .trim();
                    
                    // Remove instruction if it's just a photo attribution or too short
                    if (!instructions[i] || 
                        instructions[i].length < 10 || 
                        instructions[i].match(/^[^a-z]*$/i)) {
                        instructions.splice(i, 1);
                        i--;
                    }
                }
            }

            // Try to find recipe name with expanded selectors
            const name = $('h1').first().text().trim() ||
                        $('[class*="recipe-title"]').first().text().trim() ||
                        $('[class*="recipe-name"]').first().text().trim() ||
                        $('[class*="recipe-header"]').first().text().trim() ||
                        $('[id*="recipe-title"]').first().text().trim() ||
                        $('[class*="recipe__title"]').first().text().trim() ||
                        $('[class*="recipe__name"]').first().text().trim();

            // Try to find servings with expanded selectors
            let servings = $('[class*="servings"], [class*="yield"], [class*="serves"], [itemprop="recipeYield"], [class*="recipe__yield"], [class*="recipe__servings"]')
                .first()
                .text()
                .trim()
                .replace(/serves|servings|yield:\s*/i, '')
                .trim();
            
            // Try to find times with expanded selectors
            const prepTimeSelectors = [
                '[class*="prep-time"]',
                '[class*="preptime"]',
                '[itemprop="prepTime"]',
                '[class*="prep_time"]',
                'time[class*="prep"]',
                '[class*="recipe__prep-time"]',
                '[class*="recipe__prep"]'
            ].join(', ');

            const cookTimeSelectors = [
                '[class*="cook-time"]',
                '[class*="cooktime"]',
                '[itemprop="cookTime"]',
                '[class*="cook_time"]',
                'time[class*="cook"]',
                '[class*="recipe__cook-time"]',
                '[class*="recipe__cook"]'
            ].join(', ');

            let prepTime = $(prepTimeSelectors).first().text().trim();
            let cookTime = $(cookTimeSelectors).first().text().trim();
                
            // Additional selectors for AllRecipes
            if (url.includes('allrecipes.com')) {
                // Look in the recipe details section which shows Prep Time, Cook Time, Total Time, Servings
                const metaItems = $('[class*="recipe-meta-item"]');
                
                metaItems.each((_, el) => {
                    const itemText = $(el).text().trim().toLowerCase();
                    const itemValue = $(el).find('[class*="recipe-meta-item-body"]').text().trim();
                    
                    if (itemText.includes('prep')) {
                        prepTime = itemValue;
                    } else if (itemText.includes('cook')) {
                        cookTime = itemValue;
                    } else if (itemText.includes('serv') || itemText.includes('yield')) {
                        servings = itemValue;
                    }
                });
                
                // If we still don't have times, look in the structured data
                const recipeSchema = $('script[type="application/ld+json"]').toArray()
                    .map(element => {
                        try {
                            return JSON.parse($(element).html() || '');
                        } catch {
                            return null;
                        }
                    })
                    .find(data => data && (
                        data['@type'] === 'Recipe' || 
                        (Array.isArray(data['@graph']) && data['@graph'].some((item: { '@type': string }) => item['@type'] === 'Recipe'))
                    ));
                
                if (recipeSchema) {
                    const recipeData = Array.isArray(recipeSchema['@graph']) 
                        ? recipeSchema['@graph'].find((item: { '@type': string }) => item['@type'] === 'Recipe')
                        : recipeSchema;
                        
                    if (!prepTime && recipeData.prepTime) {
                        // Handle ISO duration format (PT format)
                        if (recipeData.prepTime.startsWith('PT')) {
                            // Will be formatted later with formatTime
                            prepTime = recipeData.prepTime;
                        } else {
                            prepTime = recipeData.prepTime;
                        }
                    }
                    if (!cookTime && recipeData.cookTime) {
                        // Handle ISO duration format (PT format)
                        if (recipeData.cookTime.startsWith('PT')) {
                            // Will be formatted later with formatTime
                            cookTime = recipeData.cookTime;
                        } else {
                            cookTime = recipeData.cookTime;
                        }
                    }
                    if (!servings && recipeData.recipeYield) {
                        servings = Array.isArray(recipeData.recipeYield) 
                            ? recipeData.recipeYield[0] 
                            : recipeData.recipeYield;
                    }
                }
                
                // Check nutrition section for servings as a last resort
                if (!servings) {
                    servings = $('[class*="nutrition-body"]')
                        .filter((_, el) => {
                            return $(el).text().toLowerCase().includes('serving') || 
                                $(el).text().toLowerCase().includes('per recipe');
                        })
                        .first()
                        .text()
                        .trim();
                }
            }
            
            // Format the times and servings
            const formatTime = (timeStr: string) => {
                if (!timeStr) return '';
                // Clean up the string and extract the time values
                timeStr = timeStr.replace(/prep|cook|time|:/gi, '').trim();
                
                // Try to extract hours and minutes
                const hourMatch = timeStr.match(/(\d+)\s*(?:hr|hour|h)[s]?/i);
                const minuteMatch = timeStr.match(/(\d+)\s*(?:min|minute|m)[s]?/i);
                
                const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
                const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
                
                if (hours > 0 && minutes > 0) {
                    return `${hours} hr ${minutes} mins`;
                } else if (hours > 0) {
                    return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
                } else if (minutes > 0) {
                    return `${minutes} mins`;
                }
                
                // If no pattern matches, just return the cleaned string if it has numbers
                return timeStr.match(/\d+/) ? timeStr : '';
            };
            
            const formatServings = (servingsStr: string) => {
                if (!servingsStr) return '';
                // Remove text like "servings", "yield", etc.
                servingsStr = servingsStr.replace(/serves|servings|yield|:|per recipe/gi, '').trim();
                // Try to extract just the numbers
                const matches = servingsStr.match(/\d+/g);
                return matches && matches.length > 0 ? matches[0] : servingsStr;
            };
            
            // Apply formatting
            prepTime = formatTime(prepTime);
            cookTime = formatTime(cookTime);
            servings = formatServings(servings);

            // Try to find recipe image
            const imageUrl = $('[itemprop="image"]').attr('src') ||
                           $('[class*="recipe-image"] img').attr('src') ||
                           $('[class*="recipe__image"] img').attr('src') ||
                           $('[class*="recipe-photo"] img').attr('src') ||
                           $('[class*="recipe-header"] img').attr('src') ||
                           $('[class*="recipe__photo"] img').attr('src') ||
                           $('[class*="recipe__image"]').attr('src') ||
                           $('meta[property="og:image"]').attr('content');

            // Try to find recipe categories
            $('[class*="category"], [class*="tag"], [itemprop="recipeCategory"], [class*="recipe-category"], [class*="recipe__category"]').each((_, el) => {
                const text = $(el).text().trim();
                if (text) {
                    categories.push(text);
                }
            });

            recipeData = {
                name,
                servings,
                prepTime,
                cookTime,
                ingredients,
                instructions,
                imageUrl,
                categories,
                sourceUrl: url
            };
        }

        // If cheerio parsing came up empty, let Claude have a go at the raw page text
        if (!recipeData.name || (!recipeData.ingredients.length && !recipeData.instructions.length)) {
            recipeData = await extractWithClaude($, url);
        }

        return NextResponse.json(recipeData);
    } catch (error) {
        console.error('Error scraping recipe:', error);
        
        // Format the error message for consistent frontend handling
        const errorMessage = error instanceof Error ? error.message : 'Failed to scrape recipe';
        
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
} 