'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/app/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import Button from '@/app/components/Button';
import UpgradeModal from '@/app/components/UpgradeModal';
import { toast } from 'react-hot-toast';
import { FiChevronLeft, FiClock, FiUsers, FiUser } from 'react-icons/fi';

interface Ingredient {
  type?: 'item';
  amount: string;
  unit: string;
  item: string;
  id: string;
  groupName?: string;
}

interface SectionBlock {
  type: 'section';
  id: string;
  label: string;
}

interface Instruction {
  type?: 'item';
  text: string;
  id: string;
  groupName?: string;
}

type IngredientEntry = Ingredient | SectionBlock;
type InstructionEntry = Instruction | SectionBlock;

interface SharedRecipeDoc {
  recipeId: string;
  recipeName: string;
  recipeImageUrl?: string;
  senderId: string;
  senderName: string | null;
  receiverId: string;
  status: string;
}

interface Recipe {
  id: string;
  name: string;
  servings?: string;
  prepTime: string;
  cookTime: string;
  ingredients: IngredientEntry[];
  instructions: InstructionEntry[] | string[];
  categories?: string[];
  imageUrl?: string;
  userId: string;
}

const FRACTION_MAP: Record<string, string> = {
  '1/2': '½', '1/4': '¼', '3/4': '¾',
  '1/3': '⅓', '2/3': '⅔',
  '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞',
};

function formatFraction(value: string): string {
  let result = value;
  for (const [frac, unicode] of Object.entries(FRACTION_MAP)) {
    result = result.replaceAll(frac, unicode);
  }
  result = result.replace(/(\d)\s+([\u00BC-\u00BE\u2150-\u215E])/g, '$1$2');
  return result;
}

export default function SharedRecipePage() {
  const { shareId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [shared, setShared] = useState<SharedRecipeDoc | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    const id = typeof shareId === 'string' ? shareId : shareId?.[0];
    if (!id) return;

    const load = async () => {
      try {
        const sharedSnap = await getDoc(doc(db, 'sharedRecipes', id));
        if (!sharedSnap.exists()) {
          setError('This shared recipe link is invalid or has expired.');
          setLoading(false);
          return;
        }
        const sharedData = sharedSnap.data() as SharedRecipeDoc;
        setShared(sharedData);

        const recipeSnap = await getDoc(doc(db, 'recipes', sharedData.recipeId));
        if (!recipeSnap.exists()) {
          setError('The recipe could not be found.');
          setLoading(false);
          return;
        }
        setRecipe({ id: recipeSnap.id, ...recipeSnap.data() } as Recipe);
      } catch {
        setError('Could not load this recipe.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [shareId, authLoading]);

  const handleSave = async () => {
    if (!user || !recipe) {
      router.push('/signup');
      return;
    }
    setIsSaving(true);
    try {
      const token = await user.getIdToken();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...recipeWithoutId } = recipe;
      const res = await fetch('/api/recipes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...recipeWithoutId,
          originalRecipeId: recipe.id,
          originalCreator: recipe.userId,
          originalCreatorName: shared?.senderName || 'Unknown',
        }),
      });
      if (res.status === 403) {
        setShowUpgradeModal(true);
        return;
      }
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      toast.success('Recipe saved to your collection!');
      router.push(`/recipes/${data.id}`);
    } catch {
      toast.error('Failed to save recipe. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderIngredients = (raw: IngredientEntry[]) => {
    const entries: IngredientEntry[] = (() => {
      if (!raw || raw.length === 0) return [];
      if (raw.some(e => e.type === 'section')) return raw;
      if (raw.some(e => (e as Ingredient).type === 'item')) return raw;
      // Old format: reconstruct section blocks from groupName
      const result: IngredientEntry[] = [];
      let lastGroup = '';
      for (const e of raw as Ingredient[]) {
        const group = e.groupName?.trim() || '';
        if (group && group !== lastGroup) result.push({ type: 'section', id: `s-${group}`, label: group });
        lastGroup = group;
        result.push(e);
      }
      return result;
    })();

    return (
      <div className="space-y-1">
        {entries.map((entry, i) => {
          if (entry.type === 'section') {
            return (
              <div key={(entry as SectionBlock).id || `s-${i}`} className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="italic text-steel/50 text-sm flex-shrink-0" style={{ fontFamily: 'var(--font-baloo_2)' }}>
                  {(entry as SectionBlock).label}
                </span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>
            );
          }
          const ing = entry as Ingredient;
          return (
            <li key={ing.id || i} className="flex items-start gap-3 list-none py-0.5">
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
          );
        })}
      </div>
    );
  };

  const renderInstructions = (raw: InstructionEntry[] | string[]) => {
    const entries: InstructionEntry[] = (() => {
      if (!raw || raw.length === 0) return [];
      if (typeof raw[0] === 'string') {
        return (raw as string[]).map((text, i) => ({ type: 'item' as const, text, id: `step-${i}` }));
      }
      const arr = raw as InstructionEntry[];
      if (arr.some(e => e.type === 'section')) return arr;
      if (arr.some(e => (e as Instruction).type === 'item')) return arr;
      const result: InstructionEntry[] = [];
      let lastGroup = '';
      for (const e of arr as Instruction[]) {
        const group = e.groupName?.trim() || '';
        if (group && group !== lastGroup) result.push({ type: 'section', id: `s-${group}`, label: group });
        lastGroup = group;
        result.push(e);
      }
      return result;
    })();

    let stepNum = 0;
    return (
      <div className="space-y-1">
        {entries.map((entry, i) => {
          if (entry.type === 'section') {
            return (
              <div key={(entry as SectionBlock).id || `s-${i}`} className="flex items-center gap-3 py-4">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="italic text-steel/50 text-sm flex-shrink-0" style={{ fontFamily: 'var(--font-baloo_2)' }}>
                  {(entry as SectionBlock).label}
                </span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>
            );
          }
          const ins = entry as Instruction;
          stepNum++;
          return (
            <li key={ins.id || i} className="flex gap-4 list-none py-1">
              <div className="w-7 h-7 rounded-full bg-light-green/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-light-green">{stepNum}</span>
              </div>
              <p className="text-steel leading-relaxed pt-0.5">{ins.text}</p>
            </li>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-eggshell flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-light-green" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-eggshell flex flex-col items-center justify-center px-6 text-center">
        <span className="text-5xl block mb-6">🍽️</span>
        <h2 className="text-xl font-bold text-cast-iron mb-2">{error || 'Recipe not found'}</h2>
        <Link href="/" className="mt-4 text-sm text-steel hover:text-cast-iron transition-colors flex items-center gap-1">
          <FiChevronLeft className="h-4 w-4" /> Go home
        </Link>
      </div>
    );
  }

  return (
    <>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="recipe_limit"
      />
      <div className="min-h-screen bg-eggshell">

        <div className="relative w-full h-[45vh] min-h-[260px]">
          {recipe.imageUrl ? (
            <>
              <Image
                src={recipe.imageUrl}
                alt={recipe.name}
                fill
                className="object-cover"
                priority
                unoptimized={!recipe.imageUrl.includes('res.cloudinary.com')}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-cast-iron flex items-center justify-center">
              <span className="text-[20vw] font-bold text-light-green/10 select-none leading-none">
                {recipe.name.charAt(0).toUpperCase()}
              </span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            </div>
          )}

          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full"
            >
              <FiChevronLeft className="w-4 h-4" /> Back
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
            <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full mb-3">
              <FiUser className="w-3.5 h-3.5" />
              Shared by {shared?.senderName || 'a friend'}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{recipe.name}</h1>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 py-8 max-w-3xl">

          <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-steel">
            {recipe.prepTime && (
              <span className="flex items-center gap-1.5">
                <FiClock className="w-4 h-4" />
                Prep: {recipe.prepTime}
              </span>
            )}
            {recipe.cookTime && (
              <span className="flex items-center gap-1.5">
                <FiClock className="w-4 h-4" />
                Cook: {recipe.cookTime}
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1.5">
                <FiUsers className="w-4 h-4" />
                Serves {recipe.servings}
              </span>
            )}
          </div>

          <div className="bg-cast-iron rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">
                {user ? 'Save this recipe to your collection' : 'Save this recipe for free'}
              </p>
              <p className="text-white/55 text-xs mt-0.5">
                {user ? 'Keep it with the rest of your recipes.' : 'Sign up in seconds. No credit card needed.'}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleSave}
              className="flex-shrink-0 w-full sm:w-auto"
            >
              {isSaving ? 'Saving...' : user ? 'Save recipe' : 'Sign up free'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-cast-iron mb-5">Ingredients</h2>
              {recipe.ingredients?.length > 0
                ? renderIngredients(recipe.ingredients)
                : <p className="text-sm text-steel">No ingredients listed.</p>
              }
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-cast-iron mb-5">Instructions</h2>
              {recipe.instructions?.length > 0
                ? renderInstructions(recipe.instructions)
                : <p className="text-sm text-steel">No instructions listed.</p>
              }
            </div>
          </div>

          {!user && (
            <div className="mt-10 text-center">
              <p className="text-sm text-steel mb-4">
                Already have an account?{' '}
                <Link href="/login" className="text-light-green font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
