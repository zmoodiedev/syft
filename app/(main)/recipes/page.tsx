'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import {
    collection, query, where, orderBy, getDocs,
    limit, startAfter, QueryDocumentSnapshot, DocumentData
} from 'firebase/firestore';
import RecipeCard from '@/app/components/RecipeCard';
import RecipeListItem from '@/app/components/RecipeListItem';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Button from '@/app/components/Button';
import { FiGrid, FiList } from 'react-icons/fi';
import { DEMO_RECIPES } from '@/app/lib/demoData';

const PAGE_SIZE = 12;

interface Recipe {
    id: string;
    name: string;
    servings?: string;
    prepTime: string;
    cookTime: string;
    createdAt: Date;
    categories: string[];
    imageUrl?: string;
    userId: string;
    visibility?: string;
}

export default function RecipesPage() {
    const { user, isDemo } = useAuth();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
    const loaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isDemo) {
            const demoData = DEMO_RECIPES.map(r => ({
                ...r,
                createdAt: new Date(),
            })) as Recipe[];
            setRecipes(demoData);
            const usedCategories = new Set<string>();
            demoData.forEach(recipe => {
                if (recipe.categories && Array.isArray(recipe.categories)) {
                    recipe.categories.forEach(cat => usedCategories.add(cat));
                }
            });
            setAvailableCategories(Array.from(usedCategories).sort());
            setLoading(false);
            return;
        }

        const fetchRecipes = async () => {
            if (!user) return;
            try {
                const recipesRef = collection(db, 'recipes');
                const q = query(
                    recipesRef,
                    where('userId', '==', user.uid),
                    orderBy('__name__', 'desc'),
                    limit(PAGE_SIZE)
                );
                const querySnapshot = await getDocs(q);
                const recipesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate()
                })) as Recipe[];

                setRecipes(recipesData);
                setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] ?? null);
                setHasMore(querySnapshot.docs.length === PAGE_SIZE);

                const usedCategories = new Set<string>();
                recipesData.forEach(recipe => {
                    if (recipe.categories && Array.isArray(recipe.categories)) {
                        recipe.categories.forEach(category => usedCategories.add(category));
                    }
                });
                setAvailableCategories(Array.from(usedCategories).sort());
            } catch (error) {
                console.error('Error fetching recipes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecipes();
    }, [user, isDemo]);

    const loadMore = useCallback(async () => {
        if (!user || !lastDoc || loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const recipesRef = collection(db, 'recipes');
            const q = query(
                recipesRef,
                where('userId', '==', user.uid),
                orderBy('__name__', 'desc'),
                startAfter(lastDoc),
                limit(PAGE_SIZE)
            );
            const querySnapshot = await getDocs(q);
            const newRecipes = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            })) as Recipe[];

            setRecipes(prev => [...prev, ...newRecipes]);
            setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] ?? null);
            setHasMore(querySnapshot.docs.length === PAGE_SIZE);

            setAvailableCategories(prev => {
                const updated = new Set(prev);
                newRecipes.forEach(recipe => {
                    if (recipe.categories && Array.isArray(recipe.categories)) {
                        recipe.categories.forEach(cat => updated.add(cat));
                    }
                });
                return Array.from(updated).sort();
            });
        } catch (error) {
            console.error('Error loading more recipes:', error);
        } finally {
            setLoadingMore(false);
        }
    }, [user, lastDoc, loadingMore, hasMore]);

    // Infinite scroll
    useEffect(() => {
        const el = loaderRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [loadMore]);

    const handleCategoryToggle = (category: string): void => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const filteredRecipes = recipes.filter(recipe => {
        const matchesCategory = selectedCategories.length === 0 ||
            selectedCategories.some(category =>
                recipe.categories && recipe.categories.includes(category)
            );
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = searchQuery === '' ||
            recipe.name.toLowerCase().includes(searchLower) ||
            (recipe.categories && recipe.categories.some(cat =>
                cat.toLowerCase().includes(searchLower)
            ));
        return matchesCategory && matchesSearch;
    });

    const sortedRecipes = viewMode === 'list'
        ? [...filteredRecipes].sort((a, b) => a.name.localeCompare(b.name))
        : filteredRecipes;

    const groupedRecipes = viewMode === 'list' ? sortedRecipes.reduce((groups, recipe) => {
        const firstLetter = recipe.name.charAt(0).toUpperCase();
        if (!groups[firstLetter]) groups[firstLetter] = [];
        groups[firstLetter].push(recipe);
        return groups;
    }, {} as Record<string, Recipe[]>) : {};

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-eggshell">
                <div className="container mx-auto px-6 py-10 md:py-14">

                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-cast-iron">
                                {isDemo ? 'Demo Recipes' : 'My Recipes'}
                            </h1>
                            {!loading && (
                                <span className="text-sm font-medium text-steel/50 tabular-nums">
                                    {filteredRecipes.length}
                                </span>
                            )}
                        </div>
                        {!isDemo && (
                            <Button href="/add-recipe">Add recipe</Button>
                        )}
                    </div>

                    {/* Search + view toggle */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-steel/50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search recipes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-cast-iron text-sm placeholder:text-steel/40 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors bg-white"
                            />
                        </div>
                        <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 flex-shrink-0">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    viewMode === 'cards' ? 'bg-cast-iron text-white' : 'text-steel hover:text-cast-iron'
                                }`}
                                title="Card view"
                            >
                                <FiGrid className="h-4 w-4" />
                                <span className="hidden sm:inline">Cards</span>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    viewMode === 'list' ? 'bg-cast-iron text-white' : 'text-steel hover:text-cast-iron'
                                }`}
                                title="List view"
                            >
                                <FiList className="h-4 w-4" />
                                <span className="hidden sm:inline">List</span>
                            </button>
                        </div>
                    </div>

                    {/* Category filters */}
                    {availableCategories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {availableCategories.map((category: string) => (
                                <button
                                    key={category}
                                    onClick={() => handleCategoryToggle(category)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                        selectedCategories.includes(category)
                                            ? 'bg-light-green text-white'
                                            : 'bg-white text-steel border border-gray-200 hover:border-light-green hover:text-light-green'
                                    }`}
                                    aria-pressed={selectedCategories.includes(category)}
                                >
                                    {category}
                                </button>
                            ))}
                            {selectedCategories.length > 0 && (
                                <button
                                    onClick={() => setSelectedCategories([])}
                                    className="px-3 py-1 rounded-full text-xs font-medium text-steel/60 hover:text-cast-iron transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    {loading ? (
                        <div className="flex justify-center py-24">
                            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-light-green" />
                        </div>
                    ) : sortedRecipes.length === 0 ? (
                        <div className="text-center py-24">
                            <span className="text-5xl block mb-4">🍽️</span>
                            <h3 className="text-xl font-bold text-cast-iron mb-2">
                                {searchQuery
                                    ? 'No recipes match your search'
                                    : selectedCategories.length > 0
                                        ? 'No recipes in those categories'
                                        : 'No recipes yet'}
                            </h3>
                            <p className="text-steel text-sm mb-6">
                                {searchQuery
                                    ? 'Try different search terms.'
                                    : selectedCategories.length > 0
                                        ? 'Try different categories or clear the filter.'
                                        : 'Add your first recipe to get started.'}
                            </p>
                            {!searchQuery && selectedCategories.length === 0 && !isDemo && (
                                <Button href="/add-recipe">Add your first recipe</Button>
                            )}
                        </div>
                    ) : (
                        <>
                            {viewMode === 'cards' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {sortedRecipes.map((recipe, index) => (
                                        <RecipeCard
                                            key={recipe.id}
                                            recipe={recipe}
                                            priority={index < 3}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(groupedRecipes)
                                        .sort(([a], [b]) => a.localeCompare(b))
                                        .map(([letter, letterRecipes]) => (
                                            <div key={letter}>
                                                <p className="text-xs font-semibold text-steel/50 uppercase tracking-widest mb-2 px-1">
                                                    {letter}
                                                </p>
                                                <div className="space-y-2">
                                                    {letterRecipes.map((recipe, index) => (
                                                        <RecipeListItem
                                                            key={recipe.id}
                                                            recipe={recipe}
                                                            index={index}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}

                            {/* Infinite scroll sentinel */}
                            {hasMore && (
                                <div ref={loaderRef} className="py-8 flex justify-center">
                                    {loadingMore && (
                                        <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200 border-t-light-green" />
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
