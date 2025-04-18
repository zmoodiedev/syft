'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const [recipe, setRecipe] = useState<null | {
    title: string;
    ingredients: string[];
    instructions: string[];
  }>(null);

  useEffect(() => {
    // Randomly select one of our error recipes
    const errorRecipes = [
      {
        title: "404 Page Not Found Soup",
        ingredients: [
          "1 missing URL",
          "2 cups of broken links",
          "1/2 tablespoon of user confusion",
          "A pinch of frustration",
          "404 grams of page dust"
        ],
        instructions: [
          "Begin by searching for the page that doesn't exist",
          "Bring the broken links to a boil in your browser",
          "Add the missing URL and stir vigorously",
          "Sprinkle with frustration and confusion",
          "Serve hot with a side of our homepage"
        ]
      },
      {
        title: "Lost Path Pasta",
        ingredients: [
          "3 cups of misdirection",
          "1 pound of deleted content",
          "2 tablespoons of error codes",
          "1 cup of shredded sitemap",
          "Fresh 404 herbs"
        ],
        instructions: [
          "Mix misdirection and error codes in a large browser window",
          "Slowly fold in the deleted content until completely gone",
          "Sprinkle with shredded sitemap for texture",
          "Garnish with fresh 404 herbs",
          "Redirect to home page to cleanse the palate"
        ]
      },
      {
        title: "Oops! Omelette",
        ingredients: [
          "4 broken eggs (links)",
          "1 cup of lost data",
          "2 tablespoons of typo sauce",
          "1/4 cup of missing parameters",
          "A dash of server confusion"
        ],
        instructions: [
          "Crack the broken links into a bowl",
          "Whisk in the lost data until frothy",
          "Heat your browser and pour in the mixture",
          "Sprinkle with typo sauce and server confusion",
          "Fold gently and serve with our navigation menu"
        ]
      }
    ];

    setRecipe(errorRecipes[Math.floor(Math.random() * errorRecipes.length)]);
  }, []);

  if (!recipe) return null;

  return (
    <div className="min-h-screen bg-eggshell flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-xl">
        {/* Recipe Card Header */}
        <div className="relative h-40 bg-gradient-to-r from-basil to-green-apple">
          <div className="absolute inset-0 bg-[url('/images/bg_ingredients.png')] bg-repeat opacity-20 bg-[length:200px_200px]"></div>
          <div className="relative h-full flex items-center justify-center z-10">
            <motion.h1 
              className="text-4xl md:text-5xl font-bold text-white text-center px-6"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              404 - Page Not Found
            </motion.h1>
          </div>
          
        </div>

        {/* Recipe Content */}
        <div className="p-6 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{recipe.title}</h2>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-gray-700 border-b border-gray-200 pb-1">Ingredients</h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <motion.li 
                    key={index} 
                    className="flex items-start gap-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + (index * 0.1), duration: 0.5 }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-basil mt-2.5"></span>
                    <span className="text-gray-600">{ingredient}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-gray-700 border-b border-gray-200 pb-1">Instructions</h3>
              <ol className="space-y-3">
                {recipe.instructions.map((instruction, index) => (
                  <motion.li 
                    key={index} 
                    className="flex gap-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + (index * 0.1), duration: 0.5 }}
                  >
                    <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 bg-basil rounded-full text-white font-medium">
                      {index + 1}
                    </div>
                    <p className="text-gray-600">{instruction}</p>
                  </motion.li>
                ))}
              </ol>
            </div>
            
            <div className="text-center mt-10">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <Link 
                  href="/" 
                  className="inline-block px-8 py-3 bg-basil text-white font-semibold rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  Back to Home
                </Link>
              </motion.div>
              <motion.p 
                className="mt-4 text-gray-500 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                The page you&apos;re looking for seems to have vanished like cookies left unattended.
              </motion.p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 