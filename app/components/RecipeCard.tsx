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
      className="relative rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 h-64"
    >
      <Link href={`/recipes/${recipe.id}`} className="block h-full">
        {/* Image Background */}
        <div className="absolute inset-0">
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
            <Image
              src="/images/bg_ingredients.png"
              alt="Default recipe background"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              className="object-cover opacity-75"
            />
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>
        
        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-5 text-white z-10">
          <div className="mt-auto">
            <h3 className="text-2xl font-bold mb-2 text-white drop-shadow-md">{recipe.name}</h3>
            
            {/* Recipe Stats */}
            <RecipeStats
              prepTime={recipe.prepTime}
              cookTime={recipe.cookTime}
              servings={recipe.servings}
              size="sm"
              className="text-white"
            />
            
            {/* View Button */}
            <Button
              className="mt-3 text-white border-none pl-0"
              variant="secondary"
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