'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import RecipeForm from './RecipeForm';
import Button from './Button';
import { FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '@/app/context/AuthContext';

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

export default function UrlInput({ initialUrl, autoSubmit }: { initialUrl?: string; autoSubmit?: boolean } = {}) {
    const { user } = useAuth();
    const [url, setUrl] = useState(initialUrl || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scrapedRecipe, setScrapedRecipe] = useState<ScrapedRecipe | null>(null);

    const doImport = useCallback(async (urlToImport: string) => {
        if (!urlToImport || !user) return;
        setLoading(true);
        setError(null);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/scrape-recipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ url: urlToImport }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to scrape recipe');
            setScrapedRecipe(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to scrape recipe. Please check the URL and try again.';
            setError(errorMessage);
            console.error('Error scraping recipe:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const hasAutoSubmitted = useRef(false);
    useEffect(() => {
        if (autoSubmit && initialUrl && user && !hasAutoSubmitted.current) {
            hasAutoSubmitted.current = true;
            doImport(initialUrl);
        }
    }, [autoSubmit, initialUrl, user, doImport]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await doImport(url);
    };

    if (scrapedRecipe) {
        return (
            <div>
                <button
                    onClick={() => setScrapedRecipe(null)}
                    className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-steel hover:text-cast-iron transition-colors"
                >
                    <FiArrowLeft className="w-4 h-4" />
                    Try another URL
                </button>
                <RecipeForm initialData={scrapedRecipe} />
            </div>
        );
    }

    return (
        <div className="max-w-2xl space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="url" className="block text-sm font-medium text-cast-iron mb-1.5">
                        Recipe URL
                    </label>
                    <input
                        type="url"
                        id="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/recipe"
                        className="w-full border border-stone-200 rounded-xl py-3 px-4 text-cast-iron text-sm placeholder:text-steel/50 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors bg-white"
                        required
                    />
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-sm font-medium text-red-700 mb-1">
                            {error.includes('Could not connect') || error.includes('blocked automated')
                                ? 'This site blocked the import'
                                : error.includes('known to block') || error.includes('requires a login')
                                ? 'Website not supported'
                                : 'Something went wrong'}
                        </p>
                        <p className="text-sm text-red-600">{error}</p>
                        {(error.includes('Could not connect') || error.includes('blocked automated') || error.includes('known to block')) && (
                            <p className="text-sm text-steel mt-2">
                                Open the recipe in your browser, screenshot it, and use <strong>Scan a Recipe</strong> — or copy the text and use <strong>Bulk Entry</strong>.
                            </p>
                        )}
                    </div>
                )}

                <Button type="submit" disabled={loading} variant="primary">
                    {loading ? 'Importing...' : 'Import recipe'}
                </Button>
            </form>

            <div className="border-t border-stone-100 pt-6">
                <h3 className="text-sm font-semibold text-cast-iron mb-2">A note on importing</h3>
                <p className="text-sm text-steel mb-3">
                    We do our best to pull ingredients and steps automatically, but some sites block this kind of access. If it doesn&apos;t work, you can always enter the recipe manually.
                </p>
                <p className="text-sm text-steel/60">
                    Questions? <a href="mailto:support@syft.cooking" className="text-light-green hover:underline">support@syft.cooking</a>
                </p>
            </div>
        </div>
    );
}
