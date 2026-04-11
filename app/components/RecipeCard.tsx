import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiClock, FiLock, FiUsers } from 'react-icons/fi';
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

const VISIBILITY_ICONS = {
  private: { icon: FiLock,  label: 'Private'     },
  friends: { icon: FiUsers, label: 'Friends only' },
};

export default function RecipeCard({ recipe, priority = false }: RecipeCardProps) {
  const { user } = useAuth();
  const isOwner = user?.uid === recipe.userId;

  const visibilityKey = (recipe.visibility ?? 'friends') as keyof typeof VISIBILITY_ICONS;
  const vis = VISIBILITY_ICONS[visibilityKey] ?? VISIBILITY_ICONS.friends;
  const VisIcon = vis.icon;

  const totalTime = recipe.prepTime || recipe.cookTime
    ? [recipe.prepTime, recipe.cookTime].filter(Boolean).join(' + ')
    : null;

  const initial = recipe.name.charAt(0).toUpperCase();
  const displayCategories = [...new Set(recipe.categories ?? [])].slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-2xl overflow-hidden h-52 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      {/* Locked badge */}
      {recipe.locked && (
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full">
          <FiLock className="w-2.5 h-2.5" />
          Read only
        </div>
      )}

      {/* Visibility badge */}
      {isOwner && !recipe.locked && (
        <div
          className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm z-20"
          title={vis.label}
        >
          <VisIcon className="h-3.5 w-3.5 text-steel" />
        </div>
      )}

      <Link href={`/recipes/${recipe.id}`} className="block h-full">

        {/* Background */}
        <div className="absolute inset-0">
          {recipe.imageUrl ? (
            <>
              <Image
                src={recipe.imageUrl}
                alt={recipe.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
                quality={85}
                className="object-cover"
                unoptimized={!recipe.imageUrl.includes('res.cloudinary.com')}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-cast-iron flex items-center justify-center">
              <span className="text-7xl font-bold text-light-green/20 select-none">{initial}</span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col justify-end p-4 z-10">
          {displayCategories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {displayCategories.map(cat => (
                <span key={cat} className="text-[10px] font-medium bg-white/15 text-white/80 rounded-full px-2 py-0.5 backdrop-blur-sm">
                  {cat}
                </span>
              ))}
            </div>
          )}

          <h3 className="text-base font-bold text-white leading-snug line-clamp-2 mb-1.5">
            {recipe.name}
          </h3>

          {(totalTime || recipe.servings) && (
            <div className="flex items-center gap-2 text-white/60 text-xs">
              {totalTime && (
                <span className="flex items-center gap-1">
                  <FiClock className="w-3 h-3" />
                  {totalTime}
                </span>
              )}
              {recipe.servings && (
                <span className="text-white/40">· Serves {recipe.servings}</span>
              )}
            </div>
          )}
        </div>

      </Link>
    </motion.div>
  );
}
