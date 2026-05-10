'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { getUserRecipeCount } from '@/app/lib/recipe';
import { TIER_FEATURES } from '@/app/lib/tiers';
import RecipeLimitBanner from '@/app/components/RecipeLimitBanner';
import LapsedBanner from '@/app/components/LapsedBanner';
import UpgradeModal from '@/app/components/UpgradeModal';

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
    locked?: boolean;
}

export default function RecipesPage() {
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecipeCount, setTotalRecipeCount] = useState(0);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
    const loaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
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

        // Load total count for limit banner (free users only)
        if (user) {
            getUserRecipeCount(user.uid).then(setTotalRecipeCount);
        }
    }, [user]);

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
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                reason="recipe_limit"
            />
            <div className="min-h-screen bg-eggshell">
                <div className="container mx-auto px-6 py-10 md:py-14">

                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-cast-iron">
                                My Recipes
                            </h1>
                            {!loading && (
                                <span className="text-sm font-medium text-steel/50 tabular-nums">
                                    {filteredRecipes.length}
                                </span>
                            )}
                        </div>
                        <Button onClick={() => {
                                const atLimit = userProfile?.tier === 'Free' &&
                                    totalRecipeCount >= TIER_FEATURES['Free'].maxRecipes;
                                if (atLimit) {
                                    setShowUpgradeModal(true);
                                } else {
                                    router.push('/add-recipe');
                                }
                            }}>
                                Add recipe
                            </Button>
                    </div>

                    {/* Lapsed-subscriber banner — takes precedence over the limit nudge */}
                    {userProfile?.tier === 'Free' && userProfile?.subscriptionLapsedAt ? (
                        <LapsedBanner
                            lockedCount={recipes.filter(r => r.locked).length}
                            onReactivateClick={() => setShowUpgradeModal(true)}
                        />
                    ) : userProfile?.tier === 'Free' ? (
                        /* Limit nudge banner — free users approaching the 15-recipe cap */
                        <RecipeLimitBanner
                            count={totalRecipeCount}
                            limit={TIER_FEATURES['Free'].maxRecipes}
                            onUpgradeClick={() => setShowUpgradeModal(true)}
                        />
                    ) : null}

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
                                className="w-full pl-11 pr-4 py-2.5 border border-stone-200 rounded-xl text-cast-iron text-sm placeholder:text-steel/40 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors bg-white"
                            />
                        </div>
                        <div className="flex items-center bg-white border border-stone-200 rounded-xl p-1 flex-shrink-0">
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

                    {/* Sidebar + content layout */}
                    <div className="flex gap-6 items-start">

                        {/* Category sidebar — desktop */}
                        {(loading || availableCategories.length > 0) && (
                            <div className="hidden md:block w-64 flex-shrink-0">
                                {loading ? (
                                    <div className="sticky top-6 bg-white rounded-2xl border border-stone-100 shadow-sm p-4 animate-pulse">
                                        <div className="h-2.5 bg-stone-200 rounded-full w-20 mb-4" />
                                        <div className="flex flex-col gap-1.5">
                                            {[72, 56, 88, 64, 80].map((w, i) => (
                                                <div key={i} className="h-8 bg-stone-100 rounded-lg" style={{ width: `${w}%` }} />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="sticky top-6 bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-[0.75rem] font-semibold text-steel/50 uppercase tracking-wider">Filter</p>
                                            {selectedCategories.length > 0 && (
                                                <button
                                                    onClick={() => setSelectedCategories([])}
                                                    className="text-xs font-medium text-light-green hover:text-green transition-colors"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            {availableCategories.map((category: string) => {
                                                const checked = selectedCategories.includes(category);
                                                return (
                                                    <label
                                                        key={category}
                                                        className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-eggshell transition-colors group"
                                                    >
                                                        <div className={`w-4 h-4 rounded flex-shrink-0 border transition-colors flex items-center justify-center ${
                                                            checked
                                                                ? 'bg-light-green border-light-green'
                                                                : 'border-stone-300 group-hover:border-light-green/60'
                                                        }`}>
                                                            {checked && (
                                                                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                                                                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={checked}
                                                            onChange={() => handleCategoryToggle(category)}
                                                        />
                                                        <span className={`text-sm transition-colors ${checked ? 'text-cast-iron font-medium' : 'text-steel'}`}>
                                                            {category}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Main content */}
                        <div className="flex-1 min-w-0">

                            {/* Category pills — mobile only */}
                            {(loading || availableCategories.length > 0) && (
                                <div className="flex flex-wrap gap-2 mb-6 md:hidden">
                                    {loading ? (
                                        [52, 68, 44, 60, 56].map((w, i) => (
                                            <div key={i} className="h-6 rounded-full bg-stone-200 animate-pulse" style={{ width: `${w}px` }} />
                                        ))
                                    ) : (
                                        <>
                                            {availableCategories.map((category: string) => (
                                                <button
                                                    key={category}
                                                    onClick={() => handleCategoryToggle(category)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                                        selectedCategories.includes(category)
                                                            ? 'bg-light-green text-white'
                                                            : 'bg-white text-steel border border-stone-200 hover:border-light-green hover:text-light-green'
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
                                        </>
                                    )}
                                </div>
                            )}

                            {loading ? (
                                viewMode === 'cards' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                                                <div className="h-52 bg-stone-200" />
                                                <div className="p-3.5 space-y-2">
                                                    <div className="h-4 bg-stone-200 rounded-full w-3/4" />
                                                    <div className="h-3 bg-stone-200 rounded-full w-2/5" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <div key={i} className="flex items-center bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden animate-pulse">
                                                <div className="w-28 h-28 flex-shrink-0 bg-stone-200" />
                                                <div className="flex-1 min-w-0 px-5 py-4 space-y-2.5">
                                                    <div className="h-2.5 bg-stone-200 rounded-full w-14" />
                                                    <div className="h-4 bg-stone-200 rounded-full w-2/3" />
                                                    <div className="h-2.5 bg-stone-200 rounded-full w-1/3" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : sortedRecipes.length === 0 ? (
                                <div className="text-center py-24">
                                    <div className="w-14 h-14 bg-tomato/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                        <i className="fa-solid fa-utensils text-tomato text-xl" />
                                    </div>
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
                                    {!searchQuery && selectedCategories.length === 0 && (
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
                                        <div ref={loaderRef} className="pt-2">
                                            {loadingMore && (
                                                viewMode === 'cards' ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                                        {Array.from({ length: 3 }).map((_, i) => (
                                                            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                                                                <div className="h-52 bg-stone-200" />
                                                                <div className="p-3.5 space-y-2">
                                                                    <div className="h-4 bg-stone-200 rounded-full w-3/4" />
                                                                    <div className="h-3 bg-stone-200 rounded-full w-2/5" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {Array.from({ length: 3 }).map((_, i) => (
                                                            <div key={i} className="flex items-center bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden animate-pulse">
                                                                <div className="w-28 h-28 flex-shrink-0 bg-stone-200" />
                                                                <div className="flex-1 min-w-0 px-5 py-4 space-y-2.5">
                                                                    <div className="h-2.5 bg-stone-200 rounded-full w-14" />
                                                                    <div className="h-4 bg-stone-200 rounded-full w-2/3" />
                                                                    <div className="h-2.5 bg-stone-200 rounded-full w-1/3" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
