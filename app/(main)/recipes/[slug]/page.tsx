'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/app/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import Image from 'next/image';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Link from 'next/link';

interface Ingredient {
  amount: string;
  unit: string;
  item: string;
  id: string;
}

interface Recipe {
  id: string;
  name: string;
  servings?: string;
  prepTime: string;
  cookTime: string;
  ingredients: Ingredient[];
  instructions: string[];
  categories?: string[];
  imageUrl?: string;
  userId: string;
}

export default function RecipeDetail() {
  const { slug } = useParams();
  const recipeId = Array.isArray(slug) ? slug[0] : slug;
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!user || !recipeId) return;

      try {
        const recipeRef = doc(db, 'recipes', recipeId);
        const recipeSnap = await getDoc(recipeRef);

        if (recipeSnap.exists()) {
          const recipeData = {
            id: recipeSnap.id,
            ...recipeSnap.data()
          } as Recipe;

          // Check if the recipe belongs to the current user
          if (recipeData.userId !== user.uid) {
            setError('You do not have permission to view this recipe');
            setLoading(false);
            return;
          }

          setRecipe(recipeData);
        } else {
          setError('Recipe not found');
        }
      } catch (err) {
        console.error('Error fetching recipe:', err);
        setError('Error loading recipe');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeId, user]);

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8 px-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">{error}</h2>
            <Link
              href="/recipes"
              className="inline-block bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Back to Recipes
            </Link>
          </div>
        ) : recipe ? (
          <div>
            {/* Header Section */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{recipe.name}</h1>

                {/* Categories */}
                {recipe.categories && recipe.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {recipe.categories.map(category => (
                      <span
                        key={category}
                        className="px-3 py-1 text-sm font-medium bg-primary-100 text-primary-800 rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/recipes"
                className="text-primary-500 hover:text-primary-600 font-medium"
              >
                Back to Recipes
              </Link>
            </div>

            {/* Recipe Image */}
            {recipe.imageUrl && (
              <div className="relative h-64 md:h-96 w-full rounded-lg overflow-hidden mb-8">
                <Image
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Recipe Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="font-semibold text-gray-700 mb-2">Prep Time</h2>
                <p className="text-xl font-medium">{recipe.prepTime || 'Not specified'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="font-semibold text-gray-700 mb-2">Cook Time</h2>
                <p className="text-xl font-medium">{recipe.cookTime || 'Not specified'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="font-semibold text-gray-700 mb-2">Servings</h2>
                <p className="text-xl font-medium">{recipe.servings || 'Not specified'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Ingredients Section */}
              <div className="lg:col-span-1">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">Ingredients</h2>
                <ul className="space-y-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={ingredient.id || index} className="flex items-start">
                      <span>
                        {ingredient.amount && <span className="font-medium">{ingredient.amount} </span>}
                        {ingredient.unit && <span>{ingredient.unit} </span>}
                        <span className="text-gray-800">{ingredient.item}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructions Section */}
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">Instructions</h2>
                <ol className="space-y-6">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex">
                      <div className="h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                        <span className="font-semibold">{index + 1}</span>
                      </div>
                      <p className="text-gray-700">{instruction}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Recipe not found</h2>
            <Link
              href="/recipes"
              className="inline-block bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Back to Recipes
            </Link>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}