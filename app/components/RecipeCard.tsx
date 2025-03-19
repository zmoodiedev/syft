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
  servings?: string;
}

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  // Calculate total time (prep + cook)
  const totalTime = () => {
    // This is a simple implementation - you might want to parse and calculate actual minutes
    return `${recipe.prepTime && recipe.cookTime ? 
      recipe.prepTime + ' + ' + recipe.cookTime : 
      recipe.prepTime || recipe.cookTime || '??'} minutes`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
    >
      <Link href={`/recipes/${recipe.id}`} className="flex h-full">
        {/* Left side - Image */}
        <div className="relative w-2/5 h-[180px]">
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
        
        {/* Right side - Content */}
        <div className="w-3/5 p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{recipe.name}</h3>
            
            {/* Recipe details with icons */}
            <div className="flex space-x-4 mb-2">
              {recipe.servings && (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <span className="text-sm text-gray-600">{recipe.servings} Servings</span>
                </div>
              )}
              
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-600">{totalTime()}</span>
              </div>
            </div>
          </div>

          {/* View Recipe Button */}
          <div className="mt-auto">
            <span className="inline-block bg-primary-100 text-primary-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-200 transition-colors">
              View Recipe
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
} 