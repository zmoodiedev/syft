'use client';

import { useState } from 'react';
import RecipeForm from './RecipeForm';
import Button from './Button';
import Link from 'next/link';
interface ScrapedRecipe {
    name: string;
    servings: string;
    prepTime: string;
    cookTime: string;
    ingredients: { id: string; item: string; amount: string; unit: string }[];
    instructions: string[];
}

export default function UrlInput() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scrapedRecipe, setScrapedRecipe] = useState<ScrapedRecipe | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        setLoading(true);
        setError(null);

        try {
            // Call your API endpoint that handles the scraping
            const response = await fetch('/api/scrape-recipe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                throw new Error('Failed to scrape recipe');
            }

            const data = await response.json();
            setScrapedRecipe(data);
        } catch (err) {
            setError('Failed to scrape recipe. Please check the URL and try again.');
            console.error('Error scraping recipe:', err);
        } finally {
            setLoading(false);
        }
    };

    if (scrapedRecipe) {
        return (
            <div>
                <button
                    onClick={() => setScrapedRecipe(null)}
                    className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Try another URL
                </button>
                <RecipeForm initialData={scrapedRecipe} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                        Recipe URL
                    </label>
                    <input
                        type="url"
                        id="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/recipe"
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                )}
                <Button
                    type="submit"
                    disabled={loading}
                    variant='outline'
                >
                    {loading ? 'Scraping Recipe...' : 'Import Recipe'}
                </Button>
            </form>

            <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-2">Recipe Extraction Notice</h3>
                <p className="mb-4">Our app does its best to extract recipe details from the webpage you provide. However, results may not always be perfect, and some websites may specifically request that we do not extracttheir content.</p>

                <p className="mb-4">If you notice missing or incorrect information, or if a recipe isn&apos;t being extracted properly, please let us know! Your feedback helps us improve support for more websites in the future.</p>

                <p>Contact us at: <Link href="mailto:support@syft.cooking">support@syft.cooking</Link></p>
            </div>
        </div>
    );
} 