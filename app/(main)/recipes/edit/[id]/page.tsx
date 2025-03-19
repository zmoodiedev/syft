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
      <div className="container mx-auto py-20 px-4">
        <div className="w-full max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Edit Recipe</h1>
          
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