'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import RecipeCard from '@/app/components/RecipeCard';
import { RECIPE_CATEGORIES } from '@/app/components/RecipeForm';
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
}

export default function RecipesPage() {
    const { user } = useAuth();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);

    useEffect(() => {
        const fetchRecipes = async () => {
            if (!user) return;

            try {
                const recipesRef = collection(db, 'recipes');
                const q = query(
                    recipesRef,
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                const querySnapshot = await getDocs(q);
                const recipesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate()
                })) as Recipe[];

                setRecipes(recipesData);
                
                // Extract unique categories from user's recipes
                const categories = new Set<string>();
                recipesData.forEach(recipe => {
                    if (recipe.categories && Array.isArray(recipe.categories)) {
                        recipe.categories.forEach(category => {
                            if (RECIPE_CATEGORIES.includes(category)) {
                                categories.add(category);
                            }
                        });
                    }
                });
                
                setAvailableCategories(Array.from(categories).sort());
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

    const filteredRecipes = selectedCategories.length > 0
        ? recipes.filter(recipe => 
            selectedCategories.some(category => 
                recipe.categories && recipe.categories.includes(category)
            )
        )
        : recipes;

    return (
        <ProtectedRoute>
            <div className="container mx-auto px-4 py-12 md:py-20">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-8">
                    <h1 className="text-4xl font-bold mb-6">Your Recipes</h1>
                    <Button
                        href="/add-recipe"
                    >
                        Add New Recipe
                    </Button>
                </div>

                {/* Category Filter */}
                {availableCategories.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4">Filter by Category</h2>
                        <div className="flex flex-wrap gap-3 p-4 bg-white">
                            {availableCategories.map((category: string) => (
                                <button
                                    key={category}
                                    onClick={() => handleCategoryToggle(category)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                        selectedCategories.includes(category)
                                            ? 'bg-green-apple text-white'
                                            : 'bg-light-grey text-steel hover:bg-gray-200 cursor-pointer'
                                    }`}
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
                            {selectedCategories.length > 0
                                ? 'No recipes match the selected categories'
                                : 'No recipes yet'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {selectedCategories.length > 0
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredRecipes.map((recipe, index) => (
                            <RecipeCard 
                                key={recipe.id} 
                                recipe={recipe} 
                                priority={index < 2}
                            />
                        ))}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}