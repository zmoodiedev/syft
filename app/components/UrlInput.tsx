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
    imageUrl?: string;
    categories?: string[];
    sourceUrl: string;
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

            const data = await response.json();

            if (!response.ok) {
                // Use the specific error message from the API if available
                throw new Error(data.error || 'Failed to scrape recipe');
            }

            setScrapedRecipe(data);
        } catch (err) {
            // Show the specific error message if available
            const errorMessage = err instanceof Error ? err.message : 'Failed to scrape recipe. Please check the URL and try again.';
            setError(errorMessage);
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
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-600 text-sm font-medium mb-1">{error.includes('known to block') ? 'Website Not Supported' : 'Error'}</p>
                        <p className="text-red-600 text-sm">{error}</p>
                        {error.includes('known to block') && (
                            <p className="text-gray-600 text-sm mt-2">
                                Try manually copying the recipe details from the website instead. Please make sure to credit the original source!
                            </p>
                        )}
                    </div>
                )}
                <Button
                    type="submit"
                    disabled={loading}
                    variant='primary'
                >
                    {loading ? 'Scraping Recipe...' : 'Import Recipe'}
                </Button>
            </form>

            <div className="border-t pt-6 text-sm">
                <h3 className="text-lg font-medium mb-2">Recipe Extraction Notice</h3>
                <p className="mb-4">Our app does its best to automatically grab recipe details (like the name, ingredients, and directions) when you paste in a recipe URL. However, some websites block this kind of access, so we might not always be able to fetch the info for you.</p>
                <p className="mb-4">If that happens, no worries — you can still manually enter the recipe details using the form provided.</p>

                <p>Contact us at: <Link href="mailto:support@syft.cooking">support@syft.cooking</Link></p>
            </div>
        </div>
    );
} 