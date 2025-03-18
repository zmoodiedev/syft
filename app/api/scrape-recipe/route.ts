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
}

interface JsonLdRecipe {
    '@type': string;
    name: string;
    recipeYield?: string | number;
    prepTime?: string;
    cookTime?: string;
    recipeIngredient: string[];
    recipeInstructions: Array<string | { '@type': string; text: string }>;
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
            };
        } else {
            // Fallback to HTML parsing if JSON-LD is not available
            const ingredients: RecipeIngredient[] = [];
            const instructions: string[] = [];

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
                const text = $(el).text().trim();
                // Remove any advertisement text or other common unwanted content
                const cleanText = text.replace(/advertisement|sponsored|ad/gi, '').trim();
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

            recipeData = {
                name,
                servings,
                prepTime,
                cookTime,
                ingredients,
                instructions,
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