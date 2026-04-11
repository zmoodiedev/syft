'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import Button from '@/app/components/Button';
import UpgradeModal from '@/app/components/UpgradeModal';
import ConfirmModal from '@/app/components/ConfirmModal';
import { toast } from 'react-hot-toast';
import { deleteImage } from '@/lib/cloudinary';
import { useFriends } from '@/app/context/FriendsContext';
import { FiEdit, FiClock, FiUsers, FiShare2, FiTrash2, FiGlobe, FiLock, FiChevronLeft, FiExternalLink, FiSun } from 'react-icons/fi';
import { useWakeLock } from '@/app/hooks/useWakeLock';
import { getUserRelationship } from '@/app/lib/user';
import { getUserRecipeCount } from '@/app/lib/recipe';
import { TIER_FEATURES } from '@/app/lib/tiers';
import { getDemoRecipeBySlug, isDemoRecipeSlug } from '@/app/lib/demoData';

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
  groupName?: string;
}

interface Instruction {
  text: string;
  id: string;
  groupName?: string;
}

interface Recipe {
  id: string;
  name: string;
  servings?: string;
  prepTime: string;
  cookTime: string;
  ingredients: Ingredient[];
  instructions: Instruction[] | string[];
  categories?: string[];
  imageUrl?: string;
  userId: string;
  sourceUrl?: string;
  originalRecipeId?: string;
  originalCreator?: string;
  originalCreatorName?: string;
  visibility?: string;
  locked?: boolean;
}

const FRACTION_MAP: Record<string, string> = {
  '1/2': '½', '1/4': '¼', '3/4': '¾',
  '1/3': '⅓', '2/3': '⅔',
  '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞',
  '1/5': '⅕', '2/5': '⅖', '3/5': '⅗', '4/5': '⅘',
  '1/6': '⅙', '5/6': '⅚',
};

function formatFraction(value: string): string {
  let result = value;
  for (const [frac, unicode] of Object.entries(FRACTION_MAP)) {
    result = result.replaceAll(frac, unicode);
  }
  // Collapse "1 ½" → "1½" for mixed numbers
  result = result.replace(/(\d)\s+([\u00BC-\u00BE\u2150-\u215E])/g, '$1$2');
  return result;
}

export default function RecipeDetail() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : params.slug?.[0];
  const { user, loading: authLoading, isDemo, userProfile } = useAuth();
  const { friends, shareRecipeWithFriend } = useFriends();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [recipeOwnerInfo, setRecipeOwnerInfo] = useState<{
    displayName: string | null;
    recipeVisibility: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFriends, setFilteredFriends] = useState<FriendItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [needsAuthentication, setNeedsAuthentication] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { isActive: wakeLockActive, isSupported: wakeLockSupported, toggle: toggleWakeLock } = useWakeLock();

  useEffect(() => {
    if (authLoading) return;

    if (isDemo && slug && isDemoRecipeSlug(slug)) {
      const demoRecipe = getDemoRecipeBySlug(slug);
      if (demoRecipe) {
        setRecipe(demoRecipe);
        setError('');
      } else {
        setError('Recipe not found');
      }
      setLoading(false);
      return;
    }

    const fetchRecipe = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        const recipeRef = doc(db, 'recipes', slug);
        let recipeSnap;
        try {
          recipeSnap = await getDoc(recipeRef);
          if (recipeSnap.exists()) {
            const recipeData = { id: recipeSnap.id, ...recipeSnap.data() } as Recipe;

            if (recipeData.visibility === 'public' ||
                (typeof recipeData.visibility === 'string' && recipeData.visibility.toLowerCase() === 'public')) {
              setRecipe(recipeData);
              setError('');
              setLoading(false);
              return;
            }

            const isOwner = user ? recipeData.userId === user.uid : false;

            if (recipeData.visibility) {
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

            const ownerRef = doc(db, 'users', recipeData.userId);
            const ownerSnap = await getDoc(ownerRef);
            if (ownerSnap.exists()) {
              const ownerData = ownerSnap.data();
              const recipeVisibility = ownerData.recipeVisibility || 'public';
              setRecipeOwnerInfo({ displayName: ownerData.displayName || null, recipeVisibility });

              if (recipeVisibility === 'public') {
                setNeedsAuthentication(false);
                setRecipe(recipeData);
                setError('');
              } else if (isOwner) {
                setRecipe(recipeData);
                setError('');
              } else if (recipeVisibility === 'friends' && user) {
                const relationshipData = await getUserRelationship(user.uid, recipeData.userId);
                if (!relationshipData.isFriend) {
                  setError('This recipe is only visible to friends of the owner');
                } else {
                  setRecipe(recipeData);
                  setError('');
                }
              } else if (recipeVisibility === 'private' && !isOwner) {
                setError('This recipe is private');
                if (!user) setNeedsAuthentication(true);
              } else {
                if (!user) setNeedsAuthentication(true);
              }
            } else {
              setRecipe(recipeData);
            }
          } else {
            setError('Recipe not found');
          }
        } catch (error) {
          console.error('Firebase error when fetching recipe:', error);
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
  }, [slug, user, authLoading, isDemo]);

  useEffect(() => {
    if (!friends.length) return;
    if (!searchQuery.trim()) {
      setFilteredFriends((friends as FriendItem[]).slice(0, 3));
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const filtered = (friends as FriendItem[]).filter(friend =>
      (friend.displayName?.toLowerCase() || '').includes(q) ||
      (friend.email?.toLowerCase() || '').includes(q)
    ).slice(0, 3);
    setFilteredFriends(filtered);
  }, [searchQuery, friends]);

  const handleDelete = async () => {
    if (!user || !recipe || !slug) return;
    setIsDeleting(true);
    try {
      if (recipe.imageUrl) {
        try { await deleteImage(recipe.imageUrl); } catch (error) { console.error('Error deleting image:', error); }
      }
      await deleteDoc(doc(db, 'recipes', slug));
      setShowDeleteConfirm(false);
      toast.success('Recipe deleted');
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
      await shareRecipeWithFriend(recipe.id, recipe.name, recipe.imageUrl, friendId);
      toast.success('Recipe shared successfully!');
      setIsShareModalOpen(false);
      setSearchQuery('');
    } catch (error: unknown) {
      console.error('Error sharing recipe in component:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to share recipe: ${errorMessage}`);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/recipes/${recipe?.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleSaveRecipe = async () => {
    if (!user || !recipe) return;
    setIsSaving(true);
    try {
      const tier = userProfile?.tier ?? 'Free';
      const limit = TIER_FEATURES[tier as keyof typeof TIER_FEATURES]?.maxRecipes ?? 15;
      const count = await getUserRecipeCount(user.uid);
      if (count >= limit) {
        toast.error(`You've reached the ${limit}-recipe limit on the ${tier} plan. Upgrade to Pro for unlimited recipes.`);
        setIsSaving(false);
        return;
      }

      const { id, ...recipeWithoutId } = recipe;
      const newRecipe = {
        ...recipeWithoutId,
        userId: user.uid,
        originalRecipeId: id,
        originalCreator: recipe.userId,
        originalCreatorName: recipeOwnerInfo?.displayName || 'Unknown user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const recipeRef = await addDoc(collection(db, 'recipes'), newRecipe);
      toast.success('Recipe saved to your collection');
      router.push(`/recipes/${recipeRef.id}`);
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast.error('Failed to save recipe to your collection');
    } finally {
      setIsSaving(false);
    }
  };

  // Auth required state
  if (needsAuthentication && !user && !loading) {
    return (
      <div className="min-h-screen bg-eggshell flex items-center justify-center">
        <div className="text-center px-6 max-w-sm">
          <span className="text-5xl block mb-6">🔒</span>
          <h2 className="text-2xl font-bold text-cast-iron mb-2">Sign in to view this recipe</h2>
          <p className="text-steel text-sm mb-8">This recipe may be public once you sign in.</p>
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              onClick={() => router.push('/login?redirect=' + encodeURIComponent(`/recipes/${slug}`))}
            >
              Sign in
            </Button>
            <Link href="/recipes" className="text-sm text-steel hover:text-cast-iron transition-colors">
              Back to recipes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Ingredients renderer
  const renderIngredients = (ingredients: Ingredient[]) => {
    const grouped: { [key: string]: Ingredient[] } = {};
    ingredients.forEach(ing => {
      const group = ing.groupName || '';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(ing);
    });
    const groups = Object.keys(grouped).sort((a, b) => {
      if (a === '') return -1;
      if (b === '') return 1;
      return a.localeCompare(b);
    });
    return (
      <div className="space-y-6">
        {groups.map(groupName => (
          <div key={groupName || 'ungrouped'}>
            {groupName && (
              <p className="text-xs font-semibold text-steel/50 uppercase tracking-widest mb-3 mt-2">
                {groupName}
              </p>
            )}
            <ul className="space-y-3">
              {grouped[groupName].map((ing, i) => (
                <li key={ing.id || i} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-light-green mt-2 flex-shrink-0" />
                  <span className="text-steel leading-snug">
                    {(ing.amount || ing.unit) && (
                      <span className="font-medium text-cast-iron">
                        {formatFraction([ing.amount, ing.unit].filter(Boolean).join(' '))}{' '}
                      </span>
                    )}
                    {ing.item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  // Instructions renderer
  const renderInstructions = (raw: Instruction[] | string[]) => {
    let instructions: Instruction[] = [];
    if (raw.length > 0) {
      if (typeof raw[0] === 'string') {
        instructions = (raw as string[]).map((text, i) => ({ text, id: `step-${i}`, groupName: '' }));
      } else {
        instructions = raw as Instruction[];
      }
    }
    const grouped: { [key: string]: Instruction[] } = {};
    instructions.forEach(ins => {
      const group = ins.groupName || '';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(ins);
    });
    const groups = Object.keys(grouped).sort((a, b) => {
      if (a === '') return -1;
      if (b === '') return 1;
      return a.localeCompare(b);
    });
    return (
      <div className="space-y-8">
        {groups.map(groupName => (
          <div key={groupName || 'ungrouped'}>
            {groupName && (
              <p className="text-xs font-semibold text-steel/50 uppercase tracking-widest mb-4 mt-2">
                {groupName}
              </p>
            )}
            <ol className="space-y-5">
              {grouped[groupName].map((ins, i) => (
                <li key={ins.id} className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-light-green/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-light-green">{i + 1}</span>
                  </div>
                  <p className="text-steel leading-relaxed pt-0.5">{ins.text}</p>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
    <UpgradeModal
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      reason="recipe_sharing"
    />
    <ConfirmModal
      isOpen={showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(false)}
      onConfirm={handleDelete}
      title="Delete recipe"
      message="This will permanently delete this recipe. There is no undo."
      confirmLabel="Delete"
      loading={isDeleting}
    />
    <div className="min-h-screen bg-eggshell">
      {loading ? (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-light-green" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <span className="text-5xl block mb-6">🍽️</span>
          <h2 className="text-xl font-bold text-cast-iron mb-2">{error}</h2>
          <Link href="/recipes" className="mt-6 text-sm text-steel hover:text-cast-iron transition-colors flex items-center gap-1">
            <FiChevronLeft className="h-4 w-4" /> Back to recipes
          </Link>
        </div>
      ) : recipe ? (
        <>
          {/* Hero */}
          <div className="relative w-full h-[50vh] min-h-[300px]">
            {/* Visibility badge */}
            {isOwner && (
              <div className={`absolute top-4 right-4 z-20 text-white text-xs font-medium px-2.5 py-1.5 rounded-full flex items-center gap-1.5 ${
                String(recipe.visibility || 'public').toLowerCase() === 'private' ? 'bg-tomato' :
                String(recipe.visibility || 'public').toLowerCase() === 'friends' ? 'bg-orange-500' :
                'bg-light-green'
              }`}>
                {String(recipe.visibility || 'public').toLowerCase() === 'private' ? <FiLock className="w-3 h-3" /> :
                 String(recipe.visibility || 'public').toLowerCase() === 'friends' ? <FiUsers className="w-3 h-3" /> :
                 <FiGlobe className="w-3 h-3" />}
                {String(recipe.visibility || 'public').toLowerCase() === 'private' ? 'Private' :
                 String(recipe.visibility || 'public').toLowerCase() === 'friends' ? 'Friends only' : 'Public'}
              </div>
            )}

            <div className="absolute inset-0">
              {recipe.imageUrl ? (
                <>
                  <Image
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    fill
                    sizes="100vw"
                    priority
                    quality={90}
                    className="object-cover"
                    unoptimized={!recipe.imageUrl.includes('res.cloudinary.com')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-cast-iron flex items-center justify-center">
                  <span className="text-[20vw] font-bold text-light-green/10 select-none leading-none">
                    {recipe.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0">
              <div className="container max-w-6xl mx-auto px-6 pb-8">
                {/* Categories */}
                {recipe.categories && recipe.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[...new Set(recipe.categories)].map(cat => (
                      <span key={cat} className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs font-medium">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 drop-shadow-md">
                  {recipe.name}
                </h1>

                {/* Meta row */}
                <div className="flex flex-wrap gap-4 text-white/80 text-sm">
                  {recipe.prepTime && (
                    <div className="flex items-center gap-1.5">
                      <FiClock className="w-4 h-4" />
                      <span>Prep: {recipe.prepTime}</span>
                    </div>
                  )}
                  {recipe.cookTime && (
                    <div className="flex items-center gap-1.5">
                      <FiClock className="w-4 h-4" />
                      <span>Cook: {recipe.cookTime}</span>
                    </div>
                  )}
                  {recipe.servings && (
                    <div className="flex items-center gap-1.5">
                      <FiUsers className="w-4 h-4" />
                      <span>Serves {recipe.servings}</span>
                    </div>
                  )}
                </div>

                {/* Attribution */}
                {recipe.originalCreatorName && (
                  <p className="mt-2 text-white/60 text-xs">Saved from {recipe.originalCreatorName}</p>
                )}
                {!isOwner && recipeOwnerInfo?.displayName && (
                  <p className="mt-2 text-white/60 text-xs">By {recipeOwnerInfo.displayName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="container max-w-6xl mx-auto px-6 py-8 pb-20">

            {/* Action bar */}
            <div className="flex items-center justify-between mb-8">
              <Link
                href="/recipes"
                className="inline-flex items-center gap-1 text-sm font-medium text-steel hover:text-cast-iron transition-colors"
              >
                <FiChevronLeft className="h-4 w-4" />
                My Recipes
              </Link>

              {!isDemo && (
                <div className="flex items-center gap-2">
                  {!isOwner && user && (
                    <Button
                      variant="primary"
                      onClick={handleSaveRecipe}
                      disabled={isSaving}
                      size="sm"
                      className="flex items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  )}
                  {user && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (userProfile?.tier === 'Free') {
                          setShowUpgradeModal(true);
                        } else if (friends.length > 0) {
                          setIsShareModalOpen(true);
                        } else {
                          setShowUpgradeModal(true);
                        }
                      }}
                      size="sm"
                      className="flex items-center gap-1.5"
                    >
                      <FiShare2 className="w-3.5 h-3.5" />
                      Share
                    </Button>
                  )}
                  {isOwner && !recipe.locked && (
                    <Button
                      onClick={() => router.push(`/recipes/edit/${recipe.id}`)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1.5"
                    >
                      <FiEdit className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  )}
                  {isOwner && !recipe.locked && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-tomato hover:bg-tomato/5 rounded-lg transition-colors"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Locked banner */}
            {isOwner && recipe.locked && (
              <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
                <FiLock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">This recipe is read-only</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    You have more than {15} recipes and your Pro subscription is no longer active. Upgrade to Pro to edit, delete, or add new recipes.
                  </p>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline flex-shrink-0"
                >
                  Upgrade
                </button>
              </div>
            )}

            {/* Source URL */}
            {recipe.sourceUrl && (
              <div className="mb-6">
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-steel hover:text-light-green transition-colors"
                >
                  <FiExternalLink className="w-3.5 h-3.5" />
                  View original source
                </a>
              </div>
            )}

            {/* Keep-screen-on toggle — mobile only */}
            {wakeLockSupported && (
              <div className="md:hidden flex justify-center mb-6">
                <button
                  onClick={toggleWakeLock}
                  className={`inline-flex items-center gap-2 pl-3.5 pr-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                    wakeLockActive
                      ? 'bg-light-green border-light-green text-white shadow-sm shadow-light-green/20'
                      : 'bg-white border-gray-200 text-steel'
                  }`}
                >
                  <FiSun className={`w-4 h-4 transition-transform ${wakeLockActive ? 'rotate-0' : '-rotate-12'}`} />
                  {wakeLockActive ? 'Screen staying on' : 'Keep screen on'}
                </button>
              </div>
            )}

            {/* Ingredients + Instructions */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
              {/* Ingredients */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-cast-iron mb-5 pb-3 border-b border-gray-100">
                  Ingredients
                </h2>
                {renderIngredients(recipe.ingredients)}
              </div>

              {/* Instructions */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-cast-iron mb-5 pb-3 border-b border-gray-100">
                  Instructions
                </h2>
                {renderInstructions(recipe.instructions)}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <span className="text-5xl block mb-6">🍽️</span>
          <h2 className="text-xl font-bold text-cast-iron mb-2">Recipe not found</h2>
          <Link href="/recipes" className="mt-4 text-sm text-steel hover:text-cast-iron transition-colors flex items-center gap-1">
            <FiChevronLeft className="h-4 w-4" /> Back to recipes
          </Link>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold text-cast-iron mb-5">Share</h2>

            {/* Copy link — public recipes only */}
            {String(recipe?.visibility ?? 'public').toLowerCase() === 'public' && (
              <div className="mb-6 p-4 bg-eggshell rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-steel/50 uppercase tracking-wider mb-2">Public link</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-steel truncate flex-1">{`${typeof window !== 'undefined' ? window.location.origin : ''}/recipes/${recipe?.id}`}</p>
                  <button
                    onClick={handleCopyLink}
                    className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      isCopied
                        ? 'bg-light-green text-white'
                        : 'bg-cast-iron text-white hover:bg-cast-iron/80'
                    }`}
                  >
                    {isCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <div className="relative mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-cast-iron placeholder:text-steel/50 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
              />
            </div>

            <div className="max-h-60 overflow-y-auto mb-6 space-y-1">
              {filteredFriends.length > 0 ? (
                <>
                  {filteredFriends.map(friend => (
                    <div key={friend.id} className="flex items-center justify-between py-3 px-1 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {friend.photoURL ? (
                            <Image src={friend.photoURL} alt={friend.displayName || 'Friend'} width={36} height={36} className="object-cover h-full w-full" />
                          ) : (
                            <span className="text-sm font-semibold text-steel">
                              {friend.displayName?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-cast-iron">{friend.displayName || 'Unknown user'}</span>
                      </div>
                      <Button variant="outline" onClick={() => handleShareRecipe(friend.id)} size="sm">
                        Share
                      </Button>
                    </div>
                  ))}
                  {friends.length > 3 && !searchQuery && (
                    <p className="text-center py-2 text-xs text-steel/60 italic">
                      {friends.length - 3} more friends. Search to find them.
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-steel text-sm">
                  {searchQuery ? 'No friends match your search.' : 'No friends to share with.'}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => { setIsShareModalOpen(false); setSearchQuery(''); setIsCopied(false); }}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
