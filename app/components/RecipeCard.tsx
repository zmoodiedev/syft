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

  const displayCategories = [...new Set(recipe.categories ?? [])].slice(0, 2);

  const background = (
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
        <div className="absolute inset-0 bg-cream">
          <Image
            src="/images/branding/kitchen.png"
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover opacity-30"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-2xl overflow-hidden h-52 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      {recipe.locked ? (
        <div className="block h-full cursor-default">
          {background}
          {/* Frosted lock overlay */}
          <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
              <FiLock className="w-5 h-5 text-white" />
            </div>
            <p className="text-white text-xs font-semibold">Locked</p>
            <p className="text-white/60 text-[10px]">Reactivate Pro to access</p>
          </div>
        </div>
      ) : (
        <>
          {/* Visibility badge */}
          {isOwner && (
            <div
              className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm z-20"
              title={vis.label}
            >
              <VisIcon className="h-3.5 w-3.5 text-steel" />
            </div>
          )}

          <Link href={`/recipes/${recipe.id}`} className="block h-full">
            {background}

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
        </>
      )}
    </motion.div>
  );
}
