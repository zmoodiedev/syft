import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Recipe {
  id: string;
  name: string;
  imageUrl?: string;
  categories?: string[];
  prepTime: string;
  cookTime: string;
}

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
    >
      <Link href={`/recipes/${recipe.id}`}>
        <div className="relative h-48 w-full">
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{recipe.name}</h3>
          
          {/* Categories */}
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.categories && recipe.categories.length > 0 ? (
              <>
                {recipe.categories.slice(0, 3).map((category) => (
                  <span
                    key={category}
                    className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full"
                  >
                    {category}
                  </span>
                ))}
                {recipe.categories.length > 3 && (
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                    +{recipe.categories.length - 3} more
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-500">No categories</span>
            )}
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-4">Prep: {recipe.prepTime}</span>
            <span>Cook: {recipe.cookTime}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
} 