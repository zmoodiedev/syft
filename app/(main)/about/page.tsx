'use client';

import { motion } from 'framer-motion';

export default function WhoWeAre() {
  return (
    <div className="min-h-screen bg-eggshell">

      {/* Hero */}
      <div className="container mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24 max-w-6xl">
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
              <h2 className="text-3xl md:text-4xl font-bold text-cast-iron leading-snug">
                You know<br/>the drill.
              </h2>
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

      {/* Values — bento grid */}
      <section className="bg-eggshell">
        <div className="container mx-auto px-6 py-16 md:py-24 max-w-6xl">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-block bg-light-green/10 text-light-green font-semibold text-xs px-3 py-1.5 rounded-full mb-5 border border-light-green/20 uppercase tracking-wider">
              Values
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-cast-iron mb-4">
              What we stand for
            </h2>
            <p className="text-steel text-lg max-w-xl mx-auto">
              A few principles that guide every decision we make.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">

            {/* Ruthlessly Clean — col-span-1 */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.0 }}
              className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm flex flex-col gap-5"
            >
              <div className="w-12 h-12 bg-tomato/10 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-ban text-tomato text-lg" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-cast-iron mb-2">Ruthlessly clean</h3>
                <p className="text-steel leading-relaxed">No ads. No sponsored content. No life story before the recipe. Just the food you came for.</p>
              </div>
            </motion.div>

            {/* Private by Default — col-span-2, dark */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="md:col-span-2 bg-cast-iron rounded-3xl p-8 lg:p-10 flex flex-col justify-end min-h-[220px]"
            >
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                <i className="fa-solid fa-lock text-white/70" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Private by default</h3>
              <p className="text-white/60 leading-relaxed max-w-sm">
                Your collection is yours. Nothing is shared unless you choose to share it. No algorithm deciding what&apos;s visible.
              </p>
            </motion.div>

            {/* Built with Care — col-span-3, horizontal */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-3 bg-cream rounded-3xl p-8 lg:p-10 border border-tomato/15 flex flex-col sm:flex-row gap-6 items-start"
            >
              <div className="w-12 h-12 bg-tomato/10 rounded-2xl flex items-center justify-center shrink-0">
                <i className="fa-solid fa-heart text-tomato text-lg" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-cast-iron mb-3">Built with care</h3>
                <p className="text-steel leading-relaxed mb-4">
                  Every feature exists because it makes cooking better, not because it drives engagement. There&apos;s no growth team optimizing for time-on-screen. Just one person trying to build something worth using.
                </p>
                <ul className="space-y-2">
                  {[
                    'No dark patterns or manipulative design',
                    'No engagement traps or infinite scroll',
                    'Honest pricing with no hidden fees',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-steel text-sm">
                      <i className="fa-solid fa-check text-light-green text-xs" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

    </div>
  );
}
