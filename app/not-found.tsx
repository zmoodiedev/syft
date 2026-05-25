'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const ERROR_RECIPES = [
  {
    title: '404 Page Not Found Soup',
    ingredients: [
      '1 missing URL',
      '2 cups of broken links',
      '½ tbsp of user confusion',
      'A pinch of frustration',
      '404 g of page dust',
    ],
    instructions: [
      'Search for the page that no longer exists.',
      'Bring the broken links to a boil in your browser.',
      'Add the missing URL and stir vigorously.',
      'Sprinkle in confusion, season to taste.',
      'Serve immediately with a side of the homepage.',
    ],
  },
  {
    title: 'Lost Path Pasta',
    ingredients: [
      '3 cups of misdirection',
      '1 lb of deleted content',
      '2 tbsp of error codes',
      '1 cup of shredded sitemap',
      'Fresh 404 herbs, to finish',
    ],
    instructions: [
      'Combine misdirection and error codes in a large browser window.',
      'Fold in the deleted content until completely gone.',
      'Sprinkle with shredded sitemap for texture.',
      'Garnish with fresh 404 herbs.',
      'Redirect to the homepage to cleanse the palate.',
    ],
  },
  {
    title: "Oops! Omelette",
    ingredients: [
      '4 broken links',
      '1 cup of lost data',
      '2 tbsp of typo sauce',
      '¼ cup of missing parameters',
      'A dash of server confusion',
    ],
    instructions: [
      'Crack the broken links into a bowl.',
      'Whisk in the lost data until frothy.',
      'Heat your browser and pour in the mixture.',
      'Season with typo sauce and server confusion.',
      'Fold gently and serve with our navigation menu.',
    ],
  },
];

export default function NotFound() {
  const [recipe, setRecipe] = useState<typeof ERROR_RECIPES[0] | null>(null);

  useEffect(() => {
    setRecipe(ERROR_RECIPES[Math.floor(Math.random() * ERROR_RECIPES.length)]);
  }, []);

  if (!recipe) return null;

  return (
    <div className="min-h-screen bg-eggshell flex items-center justify-center px-4 py-16">
      <motion.div
        className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative h-36 bg-cast-iron flex items-center justify-center overflow-hidden">
          <span className="absolute text-[11rem] font-bold text-light-green/8 select-none leading-none pointer-events-none">
            404
          </span>
          <div className="relative z-10 text-center px-6">
            <span className="inline-block bg-light-green/15 text-light-green text-xs font-semibold px-3 py-1 rounded-full border border-light-green/25 tracking-wide mb-2">
              Page not found
            </span>
            <h1 className="text-xl font-bold text-white">{recipe.title}</h1>
          </div>
        </div>

        <div className="p-7">

          <div className="mb-7">
            <h2 className="text-xs font-semibold text-steel/50 uppercase tracking-widest mb-3 pb-2 border-b border-gray-100">
              Ingredients
            </h2>
            <ul className="space-y-2.5">
              {recipe.ingredients.map((ingredient, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.07, duration: 0.4 }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-light-green mt-2 flex-shrink-0" />
                  <span className="text-sm text-steel">{ingredient}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="mb-8">
            <h2 className="text-xs font-semibold text-steel/50 uppercase tracking-widest mb-3 pb-2 border-b border-gray-100">
              Instructions
            </h2>
            <ol className="space-y-3.5">
              {recipe.instructions.map((step, i) => (
                <motion.li
                  key={i}
                  className="flex gap-3"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.07, duration: 0.4 }}
                >
                  <div className="w-6 h-6 rounded-full bg-light-green/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-light-green">{i + 1}</span>
                  </div>
                  <p className="text-sm text-steel leading-relaxed">{step}</p>
                </motion.li>
              ))}
            </ol>
          </div>

          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.4 }}
          >
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-2.5 bg-light-green text-white text-sm font-semibold rounded-xl hover:bg-green transition-colors"
            >
              Back to home
            </Link>
            <p className="mt-3 text-xs text-steel/50">
              The page you&apos;re looking for seems to have vanished like cookies left unattended.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
