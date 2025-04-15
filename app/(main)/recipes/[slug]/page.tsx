'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import Image from 'next/image';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import ScrollToTopLink from '@/app/components/ScrollToTopLink';
import Button from '@/app/components/Button';
import { toast } from 'react-hot-toast';
import { deleteImage } from '@/lib/cloudinary';
import { useFriends } from '@/app/context/FriendsContext';
import { FiEdit, FiClock, FiUsers, FiShare2, FiTrash2 } from 'react-icons/fi';

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
  const { friends, shareRecipeWithFriend } = useFriends();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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

  const isOwner = user && recipe && user.uid === recipe.userId;

  const handleShareRecipe = async (friendId: string) => {
    if (!recipe) return;
    
    try {
      console.log('Attempting to share recipe', recipe.id, 'with friend', friendId);
      
      await shareRecipeWithFriend(
        recipe.id,
        recipe.name,
        recipe.imageUrl,
        friendId
      );
      
      toast.success('Recipe shared successfully!');
      setIsShareModalOpen(false);
    } catch (error: unknown) {
      console.error('Error sharing recipe in component:', error);
      
      // Detailed error information
      const errorMessage = error instanceof Error 
        ? error.message
        : 'Unknown error occurred';
        
      // Log additional context
      console.error('Error context:', { 
        recipeId: recipe.id,
        recipeName: recipe.name,
        friendId,
        errorDetails: error
      });
      
      toast.error(`Failed to share recipe: ${errorMessage}`);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-eggshell">
        {loading ? (
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : error ? (
          <div className="container mx-auto px-4 py-20 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">{error}</h2>
            <ScrollToTopLink
              href="/recipes"
              className="inline-block px-6 py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Back to Recipes
            </ScrollToTopLink>
          </div>
        ) : recipe ? (
          <div className="container mx-auto px-4 py-12">
            {/* Header Section */}
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
                <div className="flex-1">
                  <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">{recipe.name}</h1>
                  
                  {/* Categories */}
                  {recipe.categories && recipe.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {recipe.categories.map(category => (
                        <span
                          key={category}
                          className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 flex-wrap">

                  {user && friends.length > 0 && (
                    <Button
                      variant="primary"
                      onClick={() => setIsShareModalOpen(true)}
                      className="flex items-center gap-2"
                      size="sm"
                    >
                      <FiShare2 className="w-4 h-4" />
                      Share
                    </Button>
                  )}
                  {isOwner && (
                    <Button
                      onClick={() => router.push(`/recipes/edit/${recipe.id}`)}
                      variant="outline"
                      className="flex items-center gap-2"
                      size="sm"
                    >
                      <FiEdit className="w-4 h-4" />
                      Edit
                    </Button>
                  )}
                  {isOwner && (
                    <Button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex items-center gap-2 text-tomato"
                      variant="ghost"
                      size="sm"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      {isDeleting ? 'Deleting' : ''}
                    </Button>
                  )}
                </div>
              </div>

              {/* Recipe Image */}
              {recipe.imageUrl && (
                <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden mb-8 shadow-lg">
                  <Image
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                    priority
                    className="object-cover"
                  />
                </div>
              )}

              {/* Recipe Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <FiClock className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-semibold text-gray-700">Prep Time</h3>
                  </div>
                  <p className="text-2xl font-medium text-gray-900">{recipe.prepTime || 'Not specified'}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <FiClock className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-semibold text-gray-700">Cook Time</h3>
                  </div>
                  <p className="text-2xl font-medium text-gray-900">{recipe.cookTime || 'Not specified'}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <FiUsers className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-semibold text-gray-700">Servings</h3>
                  </div>
                  <p className="text-2xl font-medium text-gray-900">{recipe.servings || 'Not specified'}</p>
                </div>
              </div>

              {/* Ingredients and Instructions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Ingredients Section */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">Ingredients</h2>
                  <ul className="space-y-3">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={ingredient.id || index} className="flex items-start gap-2  mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5"></span>
                        <span className="text-gray-700">
                          {ingredient.amount && <span className="font-medium">{ingredient.amount} </span>}
                          {ingredient.unit && <span>{ingredient.unit} </span>}
                          <span>{ingredient.item}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions Section */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">Instructions</h2>
                  <ol className="space-y-6">
                    {recipe.instructions.map((instruction, index) => (
                      <li key={index} className="flex gap-4">
                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                          <span className="font-semibold">{index + 1}</span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{instruction}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-20 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Recipe not found</h2>
            <ScrollToTopLink
              href="/recipes"
              className="inline-block px-6 py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Back to Recipes
            </ScrollToTopLink>
          </div>
        )}

        {/* Share Recipe Modal */}
        {isShareModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Share with Friends</h2>
              
              <div className="max-h-60 overflow-y-auto mb-6">
                {friends.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {friend.displayName?.charAt(0) || 'U'}
                      </div>
                      <span className="font-medium text-gray-900">{friend.displayName || 'Unknown User'}</span>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => handleShareRecipe(friend.id)}
                      className="text-sm"
                    >
                      Share
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button 
                  variant="primary" 
                  onClick={() => setIsShareModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}