import Link from 'next/link';
import { motion } from 'framer-motion';

interface Recipe {
  id: string;
  name: string;
  imageUrl?: string;
}

interface RecipeListItemProps {
  recipe: Recipe;
  index: number;
}

export default function RecipeListItem({ recipe, index }: RecipeListItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="group relative"
      style={{ 
        zIndex: 1000 + index,
        marginTop: index === 0 ? '0' : '-8px'
      }}
    >
      <Link href={`/recipes/${recipe.id}`} className="block">
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          className="relative bg-white rounded-t-lg shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 p-4 cursor-pointer w-full"
          style={{
            background: recipe.imageUrl 
              ? `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%), url(${recipe.imageUrl})`
              : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',

          }}
        >
          {/* Recipe card top edge effect */}
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"></div>
          
          
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-light-green transition-colors duration-200">
              {recipe.name}
            </h3>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
} 