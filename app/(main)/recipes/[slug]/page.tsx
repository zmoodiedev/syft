'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import Image from 'next/image';
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
  originalRecipeId?: string;  // Reference to the original recipe
  originalCreator?: string;   // Reference to the original creator's user ID
  originalCreatorName?: string; // Name of the original creator
  visibility?: string;  // Recipe visibility (public, private, friends)
}

export default function RecipeDetail() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : params.slug?.[0];
  const { user, loading: authLoading } = useAuth();
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
  const [isSaving, setIsSaving] = useState(false);
  const [needsAuthentication, setNeedsAuthentication] = useState(false);

  useEffect(() => {
    // Wait until auth state is resolved
    if (authLoading) return;

    const fetchRecipe = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        
        const recipeRef = doc(db, 'recipes', slug);
        let recipeSnap;
        
        try {
          // First try to get the document without requiring auth
          recipeSnap = await getDoc(recipeRef);
          
          if (recipeSnap.exists()) {
            const recipeData = {
              id: recipeSnap.id,
              ...recipeSnap.data()
            } as Recipe;
            
            // Check if the recipe has a visibility field directly
            if (recipeData.visibility === 'public' || 
                (typeof recipeData.visibility === 'string' && recipeData.visibility.toLowerCase() === 'public')) {

              setRecipe(recipeData);
              setError('');
              setLoading(false);
              return;
            }
            
            // Continue with normal processing for authenticated users
            const isOwner = user ? recipeData.userId === user.uid : false;
            
            // If the recipe has an explicit visibility setting, use it
            if (recipeData.visibility) {
              console.log('Using explicit visibility:', recipeData.visibility);
              const visibilityStr = String(recipeData.visibility).toLowerCase();
              
              if (visibilityStr === 'public' || isOwner) {
                setRecipe(recipeData);
                setError('');
              } else if (visibilityStr === 'friends' && user) {
                const relationshipData = await getUserRelationship(user.uid, recipeData.userId);
                if (!relationshipData.isFriend) {
                  setError('This recipe is only visible to friends of the owner');
                } else {
                  setRecipe(recipeData);
                  setError('');
                }
              } else if (visibilityStr === 'private' && !isOwner) {
                setError('This recipe is private');
              }
              setLoading(false);
              return;
            }
            
            // If the recipe doesn't have visibility field, fall back to the owner's settings
            const ownerRef = doc(db, 'users', recipeData.userId);
            const ownerSnap = await getDoc(ownerRef);
            
            if (ownerSnap.exists()) {
              const ownerData = ownerSnap.data();
              const recipeVisibility = ownerData.recipeVisibility || 'public';
              
              setRecipeOwnerInfo({
                displayName: ownerData.displayName || null,
                recipeVisibility: recipeVisibility
              });
              
              // Check visibility permissions
              if (recipeVisibility === 'public') {
                // Public recipes are visible to everyone
                setNeedsAuthentication(false);
                setRecipe(recipeData);
                setError('');
              } 
              else if (isOwner) {
                // Owner can always see their own recipes
                setRecipe(recipeData);
                setError('');
              }
              else if (recipeVisibility === 'friends' && user) {
                // Check if user is a friend of the recipe owner
                const relationshipData = await getUserRelationship(user.uid, recipeData.userId);
                
                if (!relationshipData.isFriend) {
                  setError('This recipe is only visible to friends of the owner');
                } else {
                  setRecipe(recipeData);
                  setError('');
                }
              }
              else if (recipeVisibility === 'private' && !isOwner) {
                setError('This recipe is private');
                if (!user) setNeedsAuthentication(true);
              }
              else {
                // If not public, not the owner, and no user - need authentication
                if (!user) {
                  setNeedsAuthentication(true);
                }
              }
            } else {
              // If we can't find the owner data, default to showing the recipe
              // This could happen if a user is deleted but their recipes remain
              setRecipe(recipeData);
            }
          } else {
            setError('Recipe not found');
          }
        } catch (error) {
          console.error('Firebase error when fetching recipe:', error);
          // If there's an error (likely permission denied), check authentication
          if (!user) {
            setNeedsAuthentication(true);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching recipe:', err);
        setError('Error loading recipe. You may need to log in to view this recipe.');
        if (!user) setNeedsAuthentication(true);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [slug, user, authLoading]);

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

  // Show recipe creator info if it's not the current user or show attribution for saved recipes
  const RecipeCreator = () => {
    if (!recipe) return null;
    
    // If the recipe has attribution information
    if (recipe.originalCreatorName) {
      return (
        <div className="text-sm text-white flex items-center mt-2">
          <span>Saved from: {recipe.originalCreatorName}</span>
        </div>
      );
    }
    
    // If viewing someone else's recipe
    if (!isOwner && recipeOwnerInfo) {
      return (
        <div className="text-sm text-white flex items-center mt-2">
          <span>Created by: {recipeOwnerInfo.displayName || 'Unknown user'}</span>
        </div>
      );
    }
    
    return null;
  };

  // Add a new function to handle saving the recipe to the user's collection
  const handleSaveRecipe = async () => {
    if (!user || !recipe) return;
    
    setIsSaving(true);
    
    try {
      // Create a new recipe in the user's collection
      const { id, ...recipeWithoutId } = recipe;
      
      const newRecipe = {
        ...recipeWithoutId,
        userId: user.uid, // Set the new owner
        originalRecipeId: id, // Reference to the original recipe
        originalCreator: recipe.userId, // Reference to the original creator
        originalCreatorName: recipeOwnerInfo?.displayName || 'Unknown user', // Name of the original creator
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add the recipe to the user's collection
      const recipeRef = await addDoc(collection(db, 'recipes'), newRecipe);
      
      toast.success('Recipe saved to your collection');
      
      // Navigate to the new recipe
      router.push(`/recipes/${recipeRef.id}`);
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast.error('Failed to save recipe to your collection');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoginPrompt = () => {
    toast.error('Please log in to save this recipe');
    router.push('/login?redirect=' + encodeURIComponent(`/recipes/${slug}`));
  };

  const pageContent = (
    <div className="min-h-screen bg-eggshell">
      {loading ? (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-basil"></div>
        </div>
      ) : error ? (
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">{error}</h2>
          {error === 'Please log in to view this recipe' && (
            <Button 
              variant="primary"
              onClick={() => router.push('/login?redirect=' + encodeURIComponent(`/recipes/${slug}`))}
              className="mb-4"
            >
              Log In
            </Button>
          )}
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
                {/* Add the Save to My Recipes button when user is not the owner */}
                {!isOwner && (
                  <Button
                    variant="primary"
                    onClick={user ? handleSaveRecipe : handleLoginPrompt}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    {isSaving ? 'Saving...' : 'Save to My Recipes'}
                  </Button>
                )}
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
  );

  // Show login prompt when authentication is required
  if (needsAuthentication && !user) {
    return (
      <div className="min-h-screen bg-eggshell">
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Login Required</h2>
          <p className="mb-6 text-gray-700">
            You need to be logged in to view recipes. This might be a public recipe that you can access after logging in.
          </p>
          <Button 
            variant="primary"
            onClick={() => router.push('/login?redirect=' + encodeURIComponent(`/recipes/${slug}`))}
            className="mb-4"
          >
            Log In
          </Button>
          <div className="mt-4">
            <ScrollToTopLink
              href="/recipes"
              className="inline-block px-6 py-3 bg-basil text-white font-semibold rounded-lg hover:bg-basil transition-colors"
            >
              Back to Recipes
            </ScrollToTopLink>
          </div>
        </div>
      </div>
    );
  }

  return pageContent;
}