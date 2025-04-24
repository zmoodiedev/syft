import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import RecipeStats from './RecipeStats';
import Button from './Button';
import { useAuth } from '@/app/context/AuthContext';
import { FiGlobe, FiLock, FiUsers } from 'react-icons/fi';

interface Recipe {
  id: string;
  name: string;
  imageUrl?: string;
  prepTime: string;
  cookTime: string;
  servings?: string;
  userId: string;
  visibility?: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  priority?: boolean;
}

export default function RecipeCard({ recipe, priority = false }: RecipeCardProps) {
  const { user } = useAuth();
  const isOwner = user?.uid === recipe.userId;
  
  // Helper to get the visibility icon
  const renderVisibilityIcon = () => {
    if (!isOwner) return null;
    
    switch(recipe.visibility) {
      case 'private':
        return (
          <div className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full z-20 shadow-sm" title="Private - Only you can view this recipe">
            <FiLock className="h-4 w-4 text-gray-600" />
          </div>
        );
      case 'friends':
        return (
          <div className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full z-20 shadow-sm" title="Friends only - Only your friends can view this recipe">
            <FiUsers className="h-4 w-4 text-gray-600" />
          </div>
        );
      case 'public':
      default:
        return (
          <div className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full z-20 shadow-sm" title="Public - Anyone can view this recipe">
            <FiGlobe className="h-4 w-4 text-gray-600" />
          </div>
        );
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 h-64"
    >
      {/* Visibility indicator (shown only to owner) */}
      {renderVisibilityIcon()}
      
      <Link href={`/recipes/${recipe.id}`} className="block h-full">
        {/* Image Background */}
        <div className="absolute inset-0">
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              quality={90}
              className="object-cover"
            />
          ) : (
            <Image
              src="/images/bg_ingredients.png"
              alt="Default recipe background"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              quality={90}
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