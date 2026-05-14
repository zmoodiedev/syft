'use client';

import { motion } from 'framer-motion';

const columns = [
  {
    status: 'Shipped',
    emoji: '✅',
    color: 'text-light-green',
    bg: 'bg-light-green/10',
    border: 'border-light-green/20',
    items: [
      { title: 'Save recipes from any URL', note: 'Paste a link, get a clean recipe.' },
      { title: 'Manual recipe entry', note: 'Build recipes from scratch.' },
      { title: 'Custom categories', note: 'Organize by cuisine, meal type, whatever works.' },
      { title: 'Recipe sharing', note: 'Send recipes directly to friends.' },
      { title: 'Friends network', note: 'Add friends and browse their public collections.' },
      { title: 'Google sign-in', note: 'One tap to get started.' },
      { title: 'Photo upload', note: 'Add your own photos to any recipe.' },
    ],
  },
  {
    status: 'Building',
    emoji: '🔨',
    color: 'text-tomato',
    bg: 'bg-tomato/10',
    border: 'border-tomato/20',
    items: [
      { title: 'Payments & subscriptions', note: 'Stripe integration for Pro plans.' },
      { title: 'Public launch', note: 'Opening sign-ups to everyone.' },
    ],
  },
  {
    status: 'Planned',
    emoji: '📋',
    color: 'text-steel',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    items: [
      { title: 'Meal planning', note: 'Drag recipes onto a weekly calendar.' },
      { title: 'Grocery lists', note: 'Auto-generate a shopping list from your meal plan.' },
      { title: 'Mobile app', note: 'Native iOS and Android.' },
      { title: 'Recipe scaling', note: 'Adjust servings and the ingredient amounts update.' },
      { title: 'Nutritional info', note: 'Estimated calories and macros per recipe.' },
      { title: 'Collections', note: 'Group recipes into shareable sets.' },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-eggshell">
      <div className="container mx-auto px-4 sm:px-6 pt-20 pb-24 md:pt-28 max-w-6xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block bg-light-green/10 text-light-green font-semibold text-xs px-3 py-1.5 rounded-full mb-6 border border-light-green/20 uppercase tracking-wider">
            Roadmap
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-cast-iron mb-4">
            What we&apos;re working on
          </h1>
          <p className="text-steel text-lg max-w-xl mx-auto">
            Syft is early. Here&apos;s what&apos;s done, what&apos;s in progress, and where we&apos;re headed.
          </p>
        </motion.div>

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns.map((col, ci) => (
            <motion.div
              key={col.status}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: ci * 0.1 }}
            >
              {/* Column header */}
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-4 border ${col.bg} ${col.color} ${col.border}`}>
                <span>{col.emoji}</span>
                {col.status}
              </div>

              {/* Items */}
              <div className="space-y-3">
                {col.items.map((item, ii) => (
                  <motion.div
                    key={ii}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: ci * 0.1 + ii * 0.05 }}
                    className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-cast-iron">{item.title}</p>
                    {item.note && (
                      <p className="text-xs text-steel mt-0.5">{item.note}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-steel text-sm mt-16"
        >
          Have an idea or a feature request?{' '}
          <a href="/contact" className="text-light-green font-semibold hover:underline">
            Tell us about it.
          </a>
        </motion.p>

      </div>
    </div>
  );
}
