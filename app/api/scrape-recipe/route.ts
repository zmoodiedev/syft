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
            $('li[class*="ingredient"], .ingredient-item, .ingredients li').each((_, el) => {
                const text = $(el).text().trim();
                const parts = text.split(' ');
                ingredients.push({
                    amount: parts[0] || '',
                    unit: parts[1] || '',
                    item: parts.slice(2).join(' '),
                });
            });

            // Common selectors for recipe instructions
            $('li[class*="instruction"], .instruction-item, .instructions li, .preparation-steps li').each((_, el) => {
                const text = $(el).text().trim();
                if (text) {
                    instructions.push(text);
                }
            });

            // Try to find recipe name
            const name = $('h1').first().text().trim() ||
                        $('[class*="recipe-title"]').first().text().trim() ||
                        $('[class*="recipe-name"]').first().text().trim();

            // Try to find servings
            const servings = $('[class*="servings"], [class*="yield"]').first().text().trim();

            // Try to find times
            const prepTime = $('[class*="prep-time"]').first().text().trim();
            const cookTime = $('[class*="cook-time"]').first().text().trim();

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