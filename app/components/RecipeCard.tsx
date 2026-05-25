import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiClock, FiLock } from 'react-icons/fi';
import { useAuth } from '@/app/context/AuthContext';

interface Recipe {
  id: string;
  name: string;
  imageUrl?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  userId: string;
  visibility?: string;
  categories?: string[];
  locked?: boolean;
}

interface RecipeCardProps {
  recipe: Recipe;
  priority?: boolean;
}

function RecipeImage({ recipe, priority }: { recipe: Recipe; priority: boolean }) {
  return recipe.imageUrl ? (
    <Image
      src={recipe.imageUrl}
      alt={recipe.name}
      fill
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      loading={priority ? 'eager' : 'lazy'}
      priority={priority}
      quality={85}
      className="object-cover"
      unoptimized={!recipe.imageUrl.includes('res.cloudinary.com')}
    />
  ) : (
    <div className="absolute inset-0 bg-stone-100 flex items-center justify-center">
      <i className="fa-solid fa-utensils text-stone-300 text-2xl" />
    </div>
  );
}

export default function RecipeCard({ recipe, priority = false }: RecipeCardProps) {
  const { user } = useAuth();
  const isOwner = user?.uid === recipe.userId;
  const isPrivate = String(recipe.visibility ?? '').toLowerCase() === 'private';

  const totalTime = recipe.prepTime || recipe.cookTime
    ? [recipe.prepTime, recipe.cookTime].filter(Boolean).join(' + ')
    : null;

  const displayCategories = [...new Set(recipe.categories ?? [])].slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      {recipe.locked ? (
        <div className="cursor-default">
          <div className="relative h-52">
            <RecipeImage recipe={recipe} priority={priority} />
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                <FiLock className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          <div className="p-3.5">
            <h3 className="text-sm font-bold text-cast-iron/40 line-clamp-2 mb-0.5">{recipe.name}</h3>
            <p className="text-xs text-steel/40">Reactivate Pro to access</p>
          </div>
        </div>
      ) : (
        <Link href={`/recipes/${recipe.id}`} className="block">
          <div className="relative h-52">
            <RecipeImage recipe={recipe} priority={priority} />

            {isOwner && isPrivate && (
              <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm z-20" title="Private">
                <FiLock className="h-3.5 w-3.5 text-steel" />
              </div>
            )}

            {displayCategories.length > 0 && (
              <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1 z-10">
                {displayCategories.map(cat => (
                  <span key={cat} className="text-[0.6875rem] font-medium bg-black/40 text-white rounded-full px-2 py-0.5 backdrop-blur-sm">
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="p-3.5">
            <h3 className="font-bold text-cast-iron leading-snug line-clamp-2 mb-1">
              {recipe.name}
            </h3>
            {(totalTime || recipe.servings) && (
              <div className="flex items-center gap-2 text-steel/60 text-sm">
                {totalTime && (
                  <span className="flex items-center gap-1">
                    <FiClock className="w-3 h-3" />
                    {totalTime}
                  </span>
                )}
                {recipe.servings && (
                  <span>· Serves {recipe.servings}</span>
                )}
              </div>
            )}
          </div>
        </Link>
      )}
    </motion.div>
  );
}
