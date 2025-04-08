'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import Image from 'next/image';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/Button';
import { toast } from 'react-hot-toast';
import { deleteImage } from '@/lib/cloudinary';

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
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : params.slug?.[0];
  const { user } = useAuth();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!user || !slug) return;

      try {
        setLoading(true);
        const recipeRef = doc(db, 'recipes', slug);
        const recipeSnap = await getDoc(recipeRef);

        if (recipeSnap.exists()) {
          const recipeData = {
            id: recipeSnap.id,
            ...recipeSnap.data()
          } as Recipe;

          // Check if the recipe belongs to the current user
          if (recipeData.userId !== user.uid) {
            setError('You do not have permission to view this recipe');
            return;
          }

          setRecipe(recipeData);
          setError('');
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

    if (user && slug) {
      fetchRecipe();
    }
  }, [slug, user]);

  const handleDelete = async () => {
    if (!user || !recipe || !slug) return;

    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);

    try {
      // First try to delete the image if it exists
      if (recipe.imageUrl) {
        try {
          await deleteImage(recipe.imageUrl);
        } catch (error) {
          console.error('Error deleting image:', error);
          // Continue with recipe deletion even if image deletion fails
        }
      }

      // Then delete the recipe document
      const recipeRef = doc(db, 'recipes', slug);
      await deleteDoc(recipeRef);

      toast.success('Recipe deleted successfully');
      router.push('/recipes');
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete recipe');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-20 px-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-blue mb-4">{error}</h2>
            <Button
              href="/recipes"
              className="mx-auto"
            >
              Back to Recipes
            </Button>
          </div>
        ) : recipe ? (
          <div>
            {/* Header Section */}
            <div className="flex justify-between items-start mb-6 flex-col md:flex-row">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{recipe.name}</h1>

                {/* Categories */}
                {recipe.categories && recipe.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {recipe.categories.map(category => (
                      <span
                        key={category}
                        className="px-3 py-1 text-sm font-medium bg-blue text-red rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => router.push(`/recipes/edit/${recipe.id}`)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit Recipe
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="danger"
                  disabled={isDeleting}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {isDeleting ? 'Deleting...' : 'Delete Recipe'}
                </Button>
              </div>
            </div>

            {/* Recipe Image with optimized loading */}
            {recipe.imageUrl && (
              <div className="relative h-64 md:h-96 w-full rounded-lg overflow-hidden mb-8">
                <Image
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                  priority
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEggJ4jD2jMQAAAABJRU5ErkJggg=="
                />
              </div>
            )}

            {/* Recipe Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-eggshell p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Prep Time</h3>
                <p className="text-xl font-medium">{recipe.prepTime || 'Not specified'}</p>
              </div>
              <div className="bg-eggshell p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Cook Time</h3>
                <p className="text-xl font-medium">{recipe.cookTime || 'Not specified'}</p>
              </div>
              <div className="bg-eggshell p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Servings</h3>
                <p className="text-xl font-medium">{recipe.servings || 'Not specified'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Ingredients Section */}
              <div className="lg:col-span-1">
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Ingredients</h2>
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
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Instructions</h2>
                <ol className="space-y-6">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex">
                      <div className="w-8 rounded-full bg-primary-500 flex items-start justify-center mr-4 flex-shrink-0">
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