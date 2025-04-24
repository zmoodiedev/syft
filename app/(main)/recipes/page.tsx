'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import RecipeCard from '@/app/components/RecipeCard';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Button from '@/app/components/Button';


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
    const { user } = useAuth();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Add effect to handle styles update after category toggle
    useEffect(() => {
        // This empty dependency effect forces a re-render when selectedCategories changes
        // It helps ensure the UI updates correctly, especially on mobile
    }, [selectedCategories]);

    useEffect(() => {
        const fetchRecipes = async () => {
            if (!user) return;

            try {
                const recipesRef = collection(db, 'recipes');
                
                // Create query to get only the user's own recipes
                // This ensures private recipes are only visible to their owner
                const q = query(
                    recipesRef,
                    where('userId', '==', user.uid),
                    orderBy('__name__', 'desc')
                );
                
                const querySnapshot = await getDocs(q);
                const recipesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate()
                })) as Recipe[];

                setRecipes(recipesData);
                
                // Extract unique categories from user's recipes
                const usedCategories = new Set<string>();
                recipesData.forEach(recipe => {
                    if (recipe.categories && Array.isArray(recipe.categories)) {
                        recipe.categories.forEach(category => {
                            // Include all categories that are actually used in recipes
                            usedCategories.add(category);
                        });
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
    }, [user]);

    const handleCategoryToggle = (category: string): void => {
        setSelectedCategories(prev => 
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };
    
    const filteredRecipes = recipes.filter(recipe => {
        // First apply category filter
        const matchesCategory = selectedCategories.length === 0 || 
            selectedCategories.some(category => 
                recipe.categories && recipe.categories.includes(category)
            );

        // Then apply search filter
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = searchQuery === '' || 
            recipe.name.toLowerCase().includes(searchLower) ||
            (recipe.categories && recipe.categories.some(cat => 
                cat.toLowerCase().includes(searchLower)
            ));

        return matchesCategory && matchesSearch;
    });

    return (
        <ProtectedRoute>
            <div className="container mx-auto px-4 py-12 md:py-20">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 flex-wrap lg:flex-nowrap">
                    <div className="flex flex-row gap-4 w-full mb-6 lg:mb-0 flex-wrap md:nowrap justify-between md:justify-start">
                        <h1 className="text-4xl font-bold">My Recipes</h1>
                        <Button
                                href="/add-recipe"
                                className="w-auto"
                            >
                        Add New Recipe
                        </Button>
                    </div>
                    {/* Search Bar */}
                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder="Search recipes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-basil focus:border-basil"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>


                {/* Category Filter */}
                {availableCategories.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4">Filter by Category</h2>
                        <div className="flex flex-wrap gap-3 p-4 bg-eggshell">
                            {availableCategories.map((category: string) => (
                                <button
                                    key={category}
                                    onClick={() => handleCategoryToggle(category)}
                                    // Improve touch behavior
                                    className={`
                                        touch-action-manipulation
                                        px-3 py-1 rounded-full text-sm font-medium 
                                        transition-all duration-150 
                                        focus:outline-none 
                                        ${selectedCategories.includes(category)
                                            ? 'bg-basil text-white hover:bg-basil hover:text-white' 
                                            : 'bg-white text-steel hover:bg-gray-100'
                                        }
                                        active:shadow-inner active:scale-95
                                    `}
                                    aria-pressed={selectedCategories.includes(category)}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
                    </div>
                ) : filteredRecipes.length === 0 ? (
                    <div className="text-center py-12">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {searchQuery
                                ? 'No recipes match your search'
                                : selectedCategories.length > 0
                                    ? 'No recipes match the selected categories'
                                    : 'No recipes yet'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {searchQuery
                                ? 'Try adjusting your search terms'
                                : selectedCategories.length > 0
                                    ? 'Try selecting different categories or clear the filters'
                                    : 'Start by adding your first recipe!'}
                        </p>
                        <Button
                            href="/add-recipe" 
                            className="mx-auto" 
                        >
                            Add Recipe
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRecipes.map((recipe, index) => (
                            <RecipeCard 
                                key={recipe.id} 
                                recipe={recipe} 
                                priority={index < 3}
                            />
                        ))}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}