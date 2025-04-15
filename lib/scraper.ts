import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapedRecipe {
    title: string;
    ingredients: string[];
    instructions: string[];
    imageUrl?: string;
}

export async function scrapeRecipe(url: string): Promise<ScrapedRecipe | null> {
    try {
        const response = await axios.get<string>(url);
        const $ = cheerio.load(response.data);

        const title = $('h1').first().text().trim();
        const ingredients = $('li').map((_, el) => $(el).text().trim()).get();
        const instructions = $('p').map((_, el) => $(el).text().trim()).get();
        const imageUrl = $('img').first().attr('src');

        if (!title || ingredients.length === 0 || instructions.length === 0) {
            return null;
        }

        return {
            title,
            ingredients,
            instructions,
            imageUrl
        };
    } catch (error) {
        console.error('Error scraping recipe:', error);
        return null;
    }
} 