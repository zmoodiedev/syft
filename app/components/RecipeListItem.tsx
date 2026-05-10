'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiChevronRight, FiClock, FiLock } from 'react-icons/fi';

interface Recipe {
  id: string;
  name: string;
  imageUrl?: string;
  prepTime?: string;
  cookTime?: string;
  categories?: string[];
  locked?: boolean;
}

interface RecipeListItemProps {
  recipe: Recipe;
  index: number;
}

export default function RecipeListItem({ recipe, index }: RecipeListItemProps) {
  const totalTime = recipe.prepTime || recipe.cookTime
    ? [recipe.prepTime, recipe.cookTime].filter(Boolean).join(' + ')
    : null;
  const displayCategories = [...new Set(recipe.categories ?? [])].slice(0, 3);

  const Thumbnail = ({ dimmed = false }: { dimmed?: boolean }) => (
    <div className={`relative w-28 h-28 flex-shrink-0 ${dimmed ? 'opacity-40' : ''}`}>
      {recipe.imageUrl ? (
        <Image
          src={recipe.imageUrl}
          alt={recipe.name}
          fill
          sizes="112px"
          className="object-cover"
          unoptimized={!recipe.imageUrl.includes('res.cloudinary.com')}
        />
      ) : (
        <div className="w-full h-full bg-cream flex items-center justify-center">
          <i className="fa-solid fa-utensils text-steel/20 text-xl" />
        </div>
      )}
      {!dimmed && displayCategories[0] && (
        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-cast-iron/75 text-white text-[0.625rem] font-semibold rounded uppercase tracking-wider">
          {displayCategories[0]}
        </span>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 12) * 0.03 }}
    >
      {recipe.locked ? (
        <div className="flex items-center bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden cursor-default">
          <Thumbnail dimmed />
          <div className="flex-1 min-w-0 px-5 py-4 opacity-40 select-none">
            <h3 className="text-base font-bold text-cast-iron truncate">{recipe.name}</h3>
            {totalTime && (
              <span className="flex items-center gap-1 text-xs text-steel/50 mt-1">
                <FiClock className="w-3 h-3" />
                {totalTime}
              </span>
            )}
          </div>
          <div className="pr-5 flex-shrink-0 flex items-center gap-1.5">
            <FiLock className="w-3.5 h-3.5 text-steel/40" />
            <span className="text-[0.6875rem] font-semibold text-steel/40">Locked</span>
          </div>
        </div>
      ) : (
        <Link
          href={`/recipes/${recipe.id}`}
          className="flex items-center bg-white border border-stone-100 rounded-2xl shadow-sm hover:shadow-md hover:border-stone-200 transition-all duration-200 group overflow-hidden"
        >
          <Thumbnail />
          <div className="flex-1 min-w-0 px-5 py-4">
            {totalTime && (
              <span className="flex items-center gap-1 text-xs text-steel/50 mb-1">
                <FiClock className="w-3 h-3" />
                {totalTime}
              </span>
            )}
            <h3 className="text-base font-bold text-cast-iron group-hover:text-light-green transition-colors duration-200 truncate">
              {recipe.name}
            </h3>
            {displayCategories.length > 1 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {displayCategories.slice(1).map(cat => (
                  <span key={cat} className="text-[0.6875rem] font-medium bg-eggshell text-steel/60 border border-stone-100 rounded-full px-2 py-0.5">
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="pr-5 flex-shrink-0">
            <FiChevronRight className="h-4 w-4 text-steel/30 group-hover:text-light-green transition-colors duration-200" />
          </div>
        </Link>
      )}
    </motion.div>
  );
}
