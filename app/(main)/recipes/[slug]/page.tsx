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
import { getUserRelationship } from '@/app/lib/user';

interface FriendItem {
  id: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

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
  sourceUrl?: string;
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
  const [recipeOwnerInfo, setRecipeOwnerInfo] = useState<{
    displayName: string | null;
    recipeVisibility: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFriends, setFilteredFriends] = useState<FriendItem[]>([]);

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
          const isOwner = recipeData.userId === user.uid;
          
          // If not the owner, check permissions
          if (!isOwner) {
            // Get recipe owner's profile to check visibility settings
            const ownerRef = doc(db, 'users', recipeData.userId);
            const ownerSnap = await getDoc(ownerRef);
            
            if (ownerSnap.exists()) {
              const ownerData = ownerSnap.data();
              setRecipeOwnerInfo({
                displayName: ownerData.displayName || null,
                recipeVisibility: ownerData.recipeVisibility || 'public'
              });
              
              // Check if we need to verify friendship status
              if (ownerData.recipeVisibility === 'friends') {
                // Check if user is a friend of the recipe owner
                const relationshipData = await getUserRelationship(user.uid, recipeData.userId);
                
                if (!relationshipData.isFriend) {
                  setError('This recipe is only visible to friends of the owner');
                  setLoading(false);
                  return;
                }
              }
              else if (ownerData.recipeVisibility === 'private' && !isOwner) {
                setError('This recipe is private');
                setLoading(false);
                return;
              }
            }
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

  // Filter friends based on search query
  useEffect(() => {
    if (!friends.length) return;
    
    if (!searchQuery.trim()) {
      // Limit to 3 friends when no search query
      setFilteredFriends((friends as FriendItem[]).slice(0, 3));
      return;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const filtered = (friends as FriendItem[]).filter(friend => 
      (friend.displayName?.toLowerCase() || '').includes(query) || 
      (friend.email?.toLowerCase() || '').includes(query)
    ).slice(0, 3); // Limit search results to 3
    
    setFilteredFriends(filtered);
  }, [searchQuery, friends]);

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
          // Do not show an error to the user for this, just log it
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
      setSearchQuery('');
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Show recipe creator info if it's not the current user
  const RecipeCreator = () => {
    if (!recipe || isOwner || !recipeOwnerInfo) return null;
    
    return (
      <div className="text-sm text-white flex items-center mt-2">
        <span>Created by: {recipeOwnerInfo.displayName || 'Unknown user'}</span>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-eggshell">
        {loading ? (
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-basil"></div>
          </div>
        ) : error ? (
          <div className="container mx-auto px-4 py-20 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">{error}</h2>
            <ScrollToTopLink
              href="/recipes"
              className="inline-block px-6 py-3 bg-basil text-white font-semibold rounded-lg hover:bg-basil transition-colors"
            >
              Back to Recipes
            </ScrollToTopLink>
          </div>
        ) : recipe ? (
          <div className="mx-auto py-8">
            {/* Full-width Image Header with Overlay Text */}
            <div className="relative w-full h-[50vh] mb-8 -mt-8">
              {recipe.imageUrl ? (
                <>
                  <div className="absolute inset-0">
                    <Image
                      src={recipe.imageUrl}
                      alt={recipe.name}
                      fill
                      sizes="100vw"
                      priority
                      quality={90}
                      className="object-cover"
                    />
                    {/* Gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                  </div>
                  <div className="container max-w-8xl mx-auto absolute bottom-0 left-0 right-0 py-6 px-4 text-white z-10">
                    <h1 className="text-4xl lg:text-5xl font-bold mb-3 drop-shadow-lg">{recipe.name}</h1>
                    
                    {/* Time and servings info */}
                    <div className="flex flex-wrap gap-4 text-white/90 text-sm">
                      {recipe.prepTime && (
                        <div className="flex items-center">
                          <FiClock className="mr-1" />
                          <span>Prep: {recipe.prepTime}</span>
                        </div>
                      )}
                      {recipe.cookTime && (
                        <div className="flex items-center">
                          <FiClock className="mr-1" />
                          <span>Cook: {recipe.cookTime}</span>
                        </div>
                      )}
                      {recipe.servings && (
                        <div className="flex items-center">
                          <FiUsers className="mr-1" />
                          <span>Serves: {recipe.servings}</span>
                        </div>
                      )}
                    </div>

                    {/* Display source URL if available */}
                    {recipe.sourceUrl && (
                      <div className="mt-2 text-white/80 text-xs">
                        <span className="font-medium">Original Source: </span>
                        <a 
                          href={recipe.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="underline hover:text-white transition-colors"
                        >
                          {recipe.sourceUrl}
                        </a>
                      </div>
                    )}
                    <RecipeCreator />
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute inset-0">
                    <Image
                      src="/images/bg_ingredients.png"
                      alt="Default recipe background"
                      fill
                      sizes="100vw"
                      priority
                      quality={90}
                      className="object-cover opacity-75"
                    />
                    {/* Gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                  </div>
                  <div className="container max-w-8xl mx-auto absolute bottom-0 left-0 right-0 py-6 px-4 text-white z-10">
                    <h1 className="text-4xl lg:text-5xl font-bold mb-3 drop-shadow-lg">{recipe.name}</h1>
                    
                    {/* Categories */}
                    {recipe.categories && recipe.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {recipe.categories.map(category => (
                          <span
                            key={category}
                            className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Time and servings info */}
                    <div className="flex flex-wrap gap-4 text-white/90 text-sm">
                      {recipe.prepTime && (
                        <div className="flex items-center">
                          <FiClock className="mr-1" />
                          <span>Prep: {recipe.prepTime}</span>
                        </div>
                      )}
                      {recipe.cookTime && (
                        <div className="flex items-center">
                          <FiClock className="mr-1" />
                          <span>Cook: {recipe.cookTime}</span>
                        </div>
                      )}
                      {recipe.servings && (
                        <div className="flex items-center">
                          <FiUsers className="mr-1" />
                          <span>Serves: {recipe.servings}</span>
                        </div>
                      )}
                    </div>

                    {/* Display source URL if available */}
                    {recipe.sourceUrl && (
                      <div className="mt-2 text-white/80 text-xs">
                        <span className="font-medium">Original Source: </span>
                        <a 
                          href={recipe.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="underline hover:text-white transition-colors"
                        >
                          {recipe.sourceUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="container max-w-8xl mx-auto px-4 flex lg:justify-end">
              <div className="flex justify-between items-center mb-8">
                
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
                      {isDeleting ? 'Deleting' : 'Delete'}
                    </Button>
                  )}
                </div>
              </div>
            </div>


            {/* Ingredients and Instructions */}
            <div className="container max-w-8xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Ingredients Section */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">Ingredients</h2>
                <ul className="space-y-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={ingredient.id || index} className="flex items-start gap-2 mb-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-basil mt-2.5"></span>
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
        ) : (
          <div className="container mx-auto px-4 py-20 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Recipe not found</h2>
            <ScrollToTopLink
              href="/recipes"
              className="inline-block px-6 py-3 bg-basil text-white font-semibold rounded-lg hover:bg-basil transition-colors"
            >
              Back to Recipes
            </ScrollToTopLink>
          </div>
        )}

        {/* Share Recipe Modal */}
        {isShareModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Share with Friends</h2>
              
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search friends..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-basil focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <div className="max-h-60 overflow-y-auto mb-6">
                {filteredFriends.length > 0 ? (
                  <>
                    {filteredFriends.map(friend => (
                      <div key={friend.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {friend.photoURL ? (
                              <Image 
                                src={friend.photoURL} 
                                alt={friend.displayName || 'Friend'} 
                                width={40} 
                                height={40}
                                className="object-cover h-full w-full" 
                              />
                            ) : (
                              <span className="text-gray-700 font-medium">
                                {friend.displayName?.charAt(0) || 'U'}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">{friend.displayName || 'Unknown User'}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleShareRecipe(friend.id)}
                          className="text-sm"
                        >
                          Share
                        </Button>
                      </div>
                    ))}
                    {friends.length > 3 && !searchQuery && (
                      <div className="text-center py-2 italic text-sm text-gray-500">
                        {friends.length - 3} more friends. Use search to find them.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No friends match your search' : 'No friends available to share with'}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button 
                  variant="primary" 
                  onClick={() => {
                    setIsShareModalOpen(false);
                    setSearchQuery('');
                  }}
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