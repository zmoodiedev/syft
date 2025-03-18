'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Link from 'next/link';

interface Recipe {
    id: string;
    name: string;
    servings: string;
    prepTime: string;
    cookTime: string;
    createdAt: Date;
}

export default function Recipes() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        async function fetchRecipes() {
            if (!user) return;

            try {
                const recipesRef = collection(db, 'recipes');
                const q = query(
                    recipesRef,
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );

                const querySnapshot = await getDocs(q);
                const recipeData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                })) as Recipe[];

                setRecipes(recipeData);
            } catch (error) {
                console.error('Error fetching recipes:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchRecipes();
    }, [user]);

    return (
        <ProtectedRoute>
            <div className="w-full max-w-4xl mx-auto py-8 px-4">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold">Your Recipes</h1>
                    <Link
                        href="/add-recipe"
                        className="bg-light-blue text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                    >
                        Add New Recipe
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-light-blue"></div>
                    </div>
                ) : recipes.length === 0 ? (
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-semibold mb-4">No recipes yet</h2>
                        <p className="text-gray-600 mb-6">Start building your collection by adding your first recipe!</p>
                        <Link
                            href="/add-recipe"
                            className="bg-light-blue text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors inline-block"
                        >
                            Add Your First Recipe
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {recipes.map((recipe) => (
                            <Link
                                key={recipe.id}
                                href={`/recipes/${recipe.id}`}
                                className="block p-6 border rounded-lg hover:border-light-blue transition-colors"
                            >
                                <h2 className="text-2xl font-semibold mb-2">{recipe.name}</h2>
                                <div className="text-gray-600 space-y-1">
                                    {recipe.servings && (
                                        <p>Servings: {recipe.servings}</p>
                                    )}
                                    <div className="flex gap-4">
                                        {recipe.prepTime && (
                                            <p>Prep: {recipe.prepTime}</p>
                                        )}
                                        {recipe.cookTime && (
                                            <p>Cook: {recipe.cookTime}</p>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}