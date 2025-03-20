import React from 'react';

interface CategoryTagsProps {
  categories: string[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function CategoryTags({ 
  categories, 
  maxDisplay = 3, 
  size = 'md',
  className = '' 
}: CategoryTagsProps) {
  if (!categories || categories.length === 0) return null;
  
  // Size-specific classes
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1 text-sm'
  };
  
  const tagClass = `inline-block ${sizeClasses[size]} font-medium bg-blue-50 text-blue-600 rounded-full`;
  const moreTagClass = `inline-block ${sizeClasses[size]} font-medium bg-gray-100 text-gray-600 rounded-full`;
  
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {categories.slice(0, maxDisplay).map((category) => (
        <span key={category} className={tagClass}>
          {category}
        </span>
      ))}
      
      {categories.length > maxDisplay && (
        <span className={moreTagClass}>
          +{categories.length - maxDisplay}
        </span>
      )}
    </div>
  );
} 