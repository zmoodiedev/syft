import React from 'react';

interface RecipeStatsProps {
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function RecipeStats({ 
  prepTime, 
  cookTime, 
  servings, 
  className = '',
  size = 'md'
}: RecipeStatsProps) {
  // Calculate total time (prep + cook)
  const totalTime = () => {
    if (!prepTime && !cookTime) return null;
    
    return `${prepTime && cookTime ? 
      `${prepTime} + ${cookTime}` : 
      prepTime || cookTime || '??'}`;
  };
  
  // Size-specific classes
  const sizeClasses = {
    sm: 'h-4 w-4 mr-1 text-xs',
    md: 'h-5 w-5 mr-1 text-sm',
    lg: 'h-6 w-6 mr-1.5 text-base'
  };
  
  const iconClass = `${sizeClasses[size]} text-gray-500`;
  const textClass = `${sizeClasses[size].split(' ').pop()} text-gray-600`;
  
  return (
    <div className={`flex flex-row space-x-4 ${className}`}>
      {/* Servings Stat */}
      {servings && (
        <div className="flex items-center mb-2 md:mb-0">
          <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          <span className={textClass}>{servings}</span>
        </div>
      )}
      
      {/* Time Stat */}
      {totalTime() && (
        <div className="flex items-center mb-2 md:mb-0">
          <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span className={textClass}>{totalTime()}</span>
        </div>
      )}
    </div>
  );
} 