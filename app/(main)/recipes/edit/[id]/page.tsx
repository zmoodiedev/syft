'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import RecipeForm, { Recipe } from '@/app/components/RecipeForm';

export default function EditRecipe() {
  const { id } = useParams();
  const recipeId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
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
            setError('You do not have permission to edit this recipe');
            setLoading(false);
            return;
          }

          if (recipeData.locked) {
            setError('This recipe is read-only. Upgrade to Pro to edit it.');
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

  const handleUpdateRecipe = async (updatedRecipe: Recipe) => {
    if (!user || !recipeId) {
      toast.error('You must be logged in to update a recipe');
      return;
    }

    try {
      const recipeRef = doc(db, 'recipes', recipeId);
      
      // Create a copy of the recipe without the ID field for Firestore
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...recipeDataWithoutId } = {
        ...updatedRecipe,
        updatedAt: serverTimestamp(),
        userId: user.uid,
      };
      
      await updateDoc(recipeRef, recipeDataWithoutId);
      toast.success('Recipe updated successfully!');
      router.push(`/recipes/${recipeId}`);
    } catch (err) {
      console.error('Error updating recipe:', err);
      toast.error('Failed to update recipe');
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-12 md:py-20 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Edit Recipe</h1>
          
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 max-w-sm mx-auto">
              <span className="text-4xl block mb-4">🔒</span>
              <h2 className="text-xl font-bold text-cast-iron mb-2">
                {error.includes('read-only') ? 'Recipe is read-only' : 'Cannot edit recipe'}
              </h2>
              <p className="text-sm text-steel mb-6">{error}</p>
              <div className="flex flex-col gap-3">
                {recipeId && (
                  <Link
                    href={`/recipes/${recipeId}`}
                    className="inline-flex items-center justify-center gap-2 bg-light-green text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green transition-colors"
                  >
                    View Recipe
                  </Link>
                )}
                <Link
                  href="/recipes"
                  className="text-sm text-steel hover:text-cast-iron transition-colors"
                >
                  Back to My Recipes
                </Link>
              </div>
            </div>
          ) : recipe ? (
            <div>
              <RecipeForm 
                initialData={recipe} 
                onSubmit={handleUpdateRecipe} 
                submitButtonText="Update Recipe"
              />
              
              <div className="mt-6 text-center">
                <button
                  onClick={() => router.push(`/recipes/${recipeId}`)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
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
      </div>
    </ProtectedRoute>
  );
}