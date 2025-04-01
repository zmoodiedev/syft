import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

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

        // Fetch the webpage content
        const response = await fetch(url);
        const html = await response.text();

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
            $('li[class*="ingredient"], .ingredient-item, .ingredients li, [class*="ingredients__item"], .mntl-structured-ingredients__list-item').each((_, el) => {
                const text = $(el).text().trim();
                const parts = text.split(' ');
                ingredients.push({
                    amount: parts[0] || '',
                    unit: parts[1] || '',
                    item: parts.slice(2).join(' '),
                });
            });

            // Common selectors for recipe instructions
            // Added AllRecipes specific selectors and other common variations
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
                [id*="recipesteps"] li
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
                        $('[id*="recipe-title"]').first().text().trim();

            // Try to find servings with expanded selectors
            const servings = $('[class*="servings"], [class*="yield"], [class*="serves"], [itemprop="recipeYield"]')
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
                'time[class*="prep"]'
            ].join(', ');

            const cookTimeSelectors = [
                '[class*="cook-time"]',
                '[class*="cooktime"]',
                '[itemprop="cookTime"]',
                '[class*="cook_time"]',
                'time[class*="cook"]'
            ].join(', ');

            const prepTime = $(prepTimeSelectors).first().text().trim();
            const cookTime = $(cookTimeSelectors).first().text().trim();

            // Try to find recipe image
            const imageUrl = $('[itemprop="image"]').attr('src') ||
                           $('[class*="recipe-image"] img').attr('src') ||
                           $('[class*="recipe__image"] img').attr('src') ||
                           $('[class*="recipe-photo"] img').attr('src') ||
                           $('[class*="recipe-header"] img').attr('src') ||
                           $('meta[property="og:image"]').attr('content');

            // Try to find recipe categories
            $('[class*="category"], [class*="tag"], [itemprop="recipeCategory"], [class*="recipe-category"]').each((_, el) => {
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

        return NextResponse.json(recipeData);
    } catch (error) {
        console.error('Error scraping recipe:', error);
        return NextResponse.json(
            { error: 'Failed to scrape recipe' },
            { status: 500 }
        );
    }
} 