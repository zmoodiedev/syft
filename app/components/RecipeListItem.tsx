'use client';

import Link from 'next/link';
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
  const displayCategories = [...new Set(recipe.categories ?? [])].slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 12) * 0.03 }}
    >
      <Link
        href={`/recipes/${recipe.id}`}
        className="flex items-center justify-between bg-white border border-stone-100 rounded-2xl px-5 py-3.5 shadow-sm hover:shadow-md hover:border-stone-200 transition-all duration-200 group"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-cast-iron group-hover:text-light-green transition-colors duration-200 truncate">
              {recipe.name}
            </h3>
            {recipe.locked && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-steel/50 flex-shrink-0">
                <FiLock className="w-3 h-3" />
                Read only
              </span>
            )}
          </div>
          {(totalTime || displayCategories.length > 0) && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {totalTime && (
                <span className="flex items-center gap-1 text-xs text-steel/50">
                  <FiClock className="w-3 h-3" />
                  {totalTime}
                </span>
              )}
              {displayCategories.map(cat => (
                <span key={cat} className="text-[10px] font-medium bg-eggshell text-steel/60 border border-stone-100 rounded-full px-2 py-0.5">
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
        <FiChevronRight className="h-4 w-4 text-steel/30 group-hover:text-light-green flex-shrink-0 ml-4 transition-colors duration-200" />
      </Link>
    </motion.div>
  );
}
