'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { getUserProfile } from '@/app/lib/user';
import { getUserRecipes } from '@/app/lib/recipe';
import { UserProfile } from '@/app/models/User';
import { Recipe } from '@/app/models/Recipe';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import RecipeCard from '@/app/components/RecipeCard';
import RecipeListItem from '@/app/components/RecipeListItem';
import { FiArrowLeft, FiGrid, FiList, FiUser } from 'react-icons/fi';

const PAGE_SIZE = 12;

export default function ProfileRecipesPage() {
    const { id } = useParams();
    const { user } = useAuth();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
    const loaderRef = useRef<HTMLDivElement>(null);

    const isOwnProfile = user?.uid === id;

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const [profileData, recipesResult] = await Promise.all([
                    getUserProfile(id as string),
                    getUserRecipes(id as string, PAGE_SIZE, undefined, user?.uid),
                ]);

                if (profileData) setProfile(profileData as UserProfile);

                setRecipes(recipesResult.recipes);
                setLastDoc(recipesResult.lastVisible);
                setHasMore(recipesResult.recipes.length === PAGE_SIZE && recipesResult.lastVisible !== null);

                const cats = new Set<string>();
                recipesResult.recipes.forEach(r => r.categories?.forEach(c => cats.add(c)));
                setAvailableCategories(Array.from(cats).sort());
            } catch (err) {
                console.error('Error loading profile recipes:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, user]);

    const loadMore = useCallback(async () => {
        if (!id || !lastDoc || loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const result = await getUserRecipes(id as string, PAGE_SIZE, lastDoc, user?.uid);
            setRecipes(prev => [...prev, ...result.recipes]);
            setLastDoc(result.lastVisible);
            setHasMore(result.recipes.length === PAGE_SIZE && result.lastVisible !== null);
            setAvailableCategories(prev => {
                const updated = new Set(prev);
                result.recipes.forEach(r => r.categories?.forEach(c => updated.add(c)));
                return Array.from(updated).sort();
            });
        } catch (err) {
            console.error('Error loading more recipes:', err);
        } finally {
            setLoadingMore(false);
        }
    }, [id, lastDoc, loadingMore, hasMore, user]);

    useEffect(() => {
        const el = loaderRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            entries => { if (entries[0].isIntersecting) loadMore(); },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [loadMore]);

    const filteredRecipes = recipes.filter(recipe => {
        const matchesCategory = selectedCategories.length === 0 ||
            selectedCategories.some(c => recipe.categories?.includes(c));
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = searchQuery === '' ||
            recipe.name.toLowerCase().includes(searchLower) ||
            (recipe.categories?.some(c => c.toLowerCase().includes(searchLower)));
        return matchesCategory && matchesSearch;
    });

    const sortedRecipes = viewMode === 'list'
        ? [...filteredRecipes].sort((a, b) => a.name.localeCompare(b.name))
        : filteredRecipes;

    const groupedRecipes = viewMode === 'list'
        ? sortedRecipes.reduce((groups, recipe) => {
            const letter = recipe.name.charAt(0).toUpperCase();
            if (!groups[letter]) groups[letter] = [];
            groups[letter].push(recipe);
            return groups;
        }, {} as Record<string, Recipe[]>)
        : {};

    const displayName = profile?.displayName || 'User';

    return (
        <div className="min-h-screen bg-eggshell">
            <div className="container mx-auto px-4 sm:px-6 py-10">

                {/* Back link */}
                <Link
                    href={`/profile/${id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-steel hover:text-cast-iron transition-colors mb-6"
                >
                    <FiArrowLeft className="w-4 h-4" />
                    Back to profile
                </Link>

                {/* Who you're browsing — visual indicator */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-6 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-light-green/10 flex items-center justify-center">
                        {profile?.photoURL ? (
                            <Image
                                src={profile.photoURL}
                                alt={displayName}
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <FiUser className="h-5 w-5 text-light-green" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-cast-iron">
                            {isOwnProfile ? 'My Recipes' : `${displayName}'s Recipes`}
                        </p>
                        {!loading && (
                            <p className="text-xs text-steel/50">{filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}</p>
                        )}
                    </div>
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
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-cast-iron text-sm placeholder:text-steel/40 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors bg-white"
                        />
                    </div>
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 flex-shrink-0">
                        <button
                            onClick={() => setViewMode('cards')}
                            title="Card view"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'cards' ? 'bg-cast-iron text-white' : 'text-steel hover:text-cast-iron'}`}
                        >
                            <FiGrid className="h-4 w-4" />
                            <span className="hidden sm:inline">Cards</span>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            title="List view"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-cast-iron text-white' : 'text-steel hover:text-cast-iron'}`}
                        >
                            <FiList className="h-4 w-4" />
                            <span className="hidden sm:inline">List</span>
                        </button>
                    </div>
                </div>

                {/* Category filters */}
                {availableCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {availableCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategories(prev =>
                                    prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                                )}
                                aria-pressed={selectedCategories.includes(cat)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    selectedCategories.includes(cat)
                                        ? 'bg-light-green text-white'
                                        : 'bg-white text-steel border border-gray-200 hover:border-light-green hover:text-light-green'
                                }`}
                            >
                                {cat}
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
                                    : `${isOwnProfile ? 'You have' : `${displayName} has`} no recipes yet`}
                        </h3>
                        <p className="text-steel text-sm">
                            {searchQuery
                                ? 'Try different search terms.'
                                : selectedCategories.length > 0
                                    ? 'Try different categories or clear the filter.'
                                    : ''}
                        </p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'cards' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {sortedRecipes.map((recipe, index) => (
                                    <RecipeCard key={recipe.id} recipe={recipe} priority={index < 3} />
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
                                                    <RecipeListItem key={recipe.id} recipe={recipe} index={index} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}

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
    );
}
