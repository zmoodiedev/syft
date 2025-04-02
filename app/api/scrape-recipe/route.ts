import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

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

            recipeData = {
                name: recipe.name,
                servings: recipe.recipeYield?.toString() || '',
                prepTime: recipe.prepTime || '',
                cookTime: recipe.cookTime || '',
                ingredients,
                instructions,
                imageUrl: typeof recipe.image === 'string' ? recipe.image : recipe.image?.url,
                categories: Array.isArray(recipe.recipeCategory) 
                    ? recipe.recipeCategory 
                    : recipe.recipeCategory ? [recipe.recipeCategory] : [],
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
            $(`
                li[class*="instruction"], 
                .instruction-item, 
                .instructions li, 
                .preparation-steps li,
                .recipe-directions__list li,
                .steps li,
                .step li,
                .mntl-sc-block-group--LI p,
                [class*="recipe__steps"] li,
                [class*="recipe-steps"] li,
                [class*="recipe-instructions"] li,
                [class*="recipesteps"] li,
                .recipe-method-step,
                [id*="recipe-steps"] li,
                [id*="recipe_steps"] li,
                [id*="recipesteps"] li,
                [class*="recipe-directions"] li,
                [class*="recipe__directions"] li,
                [class*="recipe__instructions"] li
            `).each((_, el) => {
                // Clone the element to avoid modifying the original
                const $el = $(el).clone();
                
                // Remove image captions and other non-instruction content
                $el.find('figcaption, .image-caption, .caption, [class*="caption"], [class*="image-description"], [class*="figure-article-caption-owner"]').remove();
                $el.find('img, figure, .image-container, [class*="image-container"]').remove();
                
                // Get the text content after removing unwanted elements
                const text = $el.text().trim();
                
                // Split the text into lines to handle multi-line content
                const lines = text.split('\n').map(line => line.trim()).filter(line => line);
                
                // Process each line and combine valid instruction parts
                const validLines = lines.filter(line => {
                    // Skip lines that are just image credits or captions
                    if (line.match(/^[A-Z\s]+$/) || // All caps
                        line.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Food\s+Studios|Photography|Media|Group|Inc\.?|LLC|Ltd\.?)$/) || // Company names
                        line.match(/^(click|tap|view|see|image|photo|picture)/i) || // Caption starts
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
                    .trim();
                
                if (cleanText) {
                    instructions.push(cleanText);
                }
            });

            // Try to find recipe name with expanded selectors
            const name = $('h1').first().text().trim() ||
                        $('[class*="recipe-title"]').first().text().trim() ||
                        $('[class*="recipe-name"]').first().text().trim() ||
                        $('[class*="recipe-header"]').first().text().trim() ||
                        $('[id*="recipe-title"]').first().text().trim() ||
                        $('[class*="recipe__title"]').first().text().trim() ||
                        $('[class*="recipe__name"]').first().text().trim();

            // Try to find servings with expanded selectors
            const servings = $('[class*="servings"], [class*="yield"], [class*="serves"], [itemprop="recipeYield"], [class*="recipe__yield"], [class*="recipe__servings"]')
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

            const prepTime = $(prepTimeSelectors).first().text().trim();
            const cookTime = $(cookTimeSelectors).first().text().trim();

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
            };
        }

        // Validate that we found at least some recipe data
        if (!recipeData.name || (!recipeData.ingredients.length && !recipeData.instructions.length)) {
            throw new Error('Could not find recipe data on this page. The website might be blocking automated access.');
        }

        return NextResponse.json(recipeData);
    } catch (error) {
        console.error('Error scraping recipe:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to scrape recipe' },
            { status: 500 }
        );
    }
} 