'use client';

import { motion } from 'framer-motion';

const values = [
  {
    icon: '🧹',
    title: 'Ruthlessly clean',
    description: "No ads. No sponsored content. No life story before the recipe. Just the food you came for.",
  },
  {
    icon: '🔒',
    title: 'Private by default',
    description: 'Your collection is yours. Nothing is shared unless you choose to share it.',
  },
  {
    icon: '❤️',
    title: 'Built with care',
    description: 'Every feature exists because it makes cooking better, not because it drives engagement.',
  },
];

export default function WhoWeAre() {
  return (
    <div className="min-h-screen bg-eggshell">

      {/* Hero */}
      <div className="container mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="inline-block bg-light-green/10 text-light-green font-semibold text-xs px-3 py-1.5 rounded-full mb-6 border border-light-green/20 uppercase tracking-wider">
            Our Story
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-cast-iron leading-tight mb-6">
            Built out of frustration.<br className="hidden md:block" /> Designed with love.
          </h1>
          <p className="text-steel text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
            Syft started as a personal project. The question was simple: why is saving a recipe so annoying?
          </p>
        </motion.div>
      </div>

      {/* Story */}
      <div className="bg-white border-y border-gray-100">
        <div className="container mx-auto px-6 py-16 md:py-20 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-16 items-start"
          >
            <div className="md:col-span-2">
              <p className="text-3xl md:text-4xl font-bold text-cast-iron leading-snug">
                You know the drill.
              </p>
            </div>
            <div className="md:col-span-3 space-y-5 text-steel leading-relaxed">
              <p>
                You find a recipe, click the link, scroll past 800 words about someone&apos;s
                trip to Tuscany, dismiss the newsletter popup, and finally get to the ingredients.
                Then your phone locks and you start all over again.
              </p>
              <p>
                There are other recipe apps. Most are cluttered, slow, or gated behind prices
                that don&apos;t feel worth it. None of them felt right.
              </p>
              <p>
                So we built Syft. One developer, one side project that got a bit out of hand,
                and a goal to make cooking from recipes actually pleasant.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Values */}
      <div className="bg-cast-iron">
        <div className="container mx-auto px-6 py-16 md:py-20 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white">What we stand for</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-8"
              >
                <span className="text-4xl block mb-4">{v.icon}</span>
                <h3 className="text-white font-bold text-lg mb-2">{v.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{v.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Personal note */}
      <div className="container mx-auto px-6 py-16 md:py-20 max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-4xl block mb-6">👋</span>
          <h2 className="text-2xl font-bold text-cast-iron mb-4">Just one person, for now.</h2>
          <p className="text-steel leading-relaxed mb-4">
            Syft is an independent project. No investors, no ad revenue, no agenda beyond
            making something people actually want to use.
          </p>
          <p className="text-steel leading-relaxed">
            If you have thoughts, ideas, or just want to say hello, we read every message.
          </p>
        </motion.div>
      </div>

    </div>
  );
}
