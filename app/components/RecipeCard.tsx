import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import RecipeStats from './RecipeStats';
import Button from './Button';

interface Recipe {
  id: string;
  name: string;
  imageUrl?: string;
  prepTime: string;
  cookTime: string;
  servings?: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  priority?: boolean;
}

export default function RecipeCard({ recipe, priority = false }: RecipeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
    >
      <Link href={`/recipes/${recipe.id}`} className="flex h-full flex-col sm:flex-row">
        <div className="relative w-full sm:w-2/5 min-h-[180px]">
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </div>
        
        <div className="w-full sm:w-3/5 p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{recipe.name}</h3>
            
            {/* Recipe Stats */}
            <RecipeStats
              prepTime={recipe.prepTime}
              cookTime={recipe.cookTime}
              servings={recipe.servings}
              size="sm"
              className="mb-2"
            />
          </div>

          {/* View Recipe Button */}
          <div className="mt-auto">
            <Button
              className=""
              variant='outline'
              size="sm"
            >
              View Recipe
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
} 