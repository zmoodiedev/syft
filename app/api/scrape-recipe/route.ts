import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Set the runtime to edge to ensure compatibility with Vercel deployments
export const runtime = 'edge';

// List of known problematic websites that block scraping
const BLOCKED_WEBSITES: string[] = [
    'https://www.canadianliving.com',
    'cooking.nytimes.com',
    'foodandwine.com',
    'epicurious.com',
    'bonappetit.com',
    'tasty.co',
    'delish.com',
    'food.com'
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
    try {
        const { url } = await request.json();

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

        // Fetch the webpage content with headers and redirect handling
        const response = await fetch(url, { 
            headers,
            redirect: 'follow',
            cache: 'no-store',
            next: { revalidate: 0 }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch recipe: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();

        // Check if the response contains common blocking messages
        if (html.includes('Access Denied') || 
            html.includes('Please enable JavaScript') || 
            html.includes('bot detection') ||
            html.includes('security check') ||
            html.includes('redirect count exceeded')) {
            throw new Error('This website appears to be blocking automated access. Please try copying the recipe manually.');
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

        // Validate that we found at least some recipe data
        if (!recipeData.name || (!recipeData.ingredients.length && !recipeData.instructions.length)) {
            throw new Error('Could not find recipe data on this page. The website might be blocking automated access.');
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