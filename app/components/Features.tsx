'use client'

import { motion } from "framer-motion";
import Image from "next/image";

export default function Features() {
  return (
    <section className="bg-eggshell relative">

      <div className="container mx-auto px-6 pt-16 pb-24 lg:pt-20 lg:pb-32 max-w-6xl">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block bg-light-green/10 text-light-green font-semibold text-xs px-3 py-1.5 rounded-full mb-5 border border-light-green/20 uppercase tracking-wider">
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-cast-iron mb-4">
            So Many Reasons to Love Syft
          </h2>
          <p className="text-steel text-lg max-w-2xl mx-auto">
            Everything you need to manage your culinary life, in one clean app.
          </p>
        </motion.div>

        {/* Bento grid — pt-16 gives the dogs room to float above the top row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 md:pt-16">

          {/* Row 1, col 1 — Save Recipes */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.0 }}
            className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm flex flex-col gap-5 md:self-end"
          >
            <div className="w-12 h-12 bg-tomato/10 rounded-2xl flex items-center justify-center">
              <i className="fa-solid fa-bookmark text-tomato text-lg" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-cast-iron mb-2">Save Recipes Instantly</h3>
              <p className="text-steel leading-relaxed">Paste a URL and we handle the rest. Extract recipes from thousands of websites, completely ad-free.</p>
            </div>
          </motion.div>

          {/* Row 1, cols 2–3 — Share with Friends */}
          <div className="md:col-span-2 relative">
            {/* Ollie & Arthur — desktop only, float above and to the right */}
            <div className="hidden md:block absolute -top-16 -right-12 z-20 pointer-events-none">
              <Image
                src="/images/branding/ollie_arthur.png"
                alt="Ollie and Arthur"
                width={440}
                height={316}
                className="w-[380px] h-auto drop-shadow-2xl"
              />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-cast-iron rounded-3xl p-8 lg:p-10 h-full min-h-[220px] flex flex-col justify-end"
            >
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                <i className="fa-solid fa-paper-plane text-white/70" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Share with Friends</h3>
              <p className="text-white/60 leading-relaxed max-w-sm">
                Send a recipe straight to a friend&apos;s Syft account. It lands in their collection automatically, no copy-pasting links.
              </p>
            </motion.div>
          </div>

          {/* Row 2, cols 1–2 — Cook Distraction-Free */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-2 bg-cream rounded-3xl p-8 lg:p-10 border border-tomato/15 flex flex-col sm:flex-row gap-6 items-start"
          >
            <div className="w-12 h-12 bg-tomato/10 rounded-2xl flex items-center justify-center shrink-0">
              <i className="fa-solid fa-scroll text-tomato text-lg" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-cast-iron mb-3">Cook Distraction-Free</h3>
              <p className="text-steel leading-relaxed mb-4">
                Just the recipe. No life stories, no ads, no pop-ups begging you to subscribe. Syft strips everything away so you can focus on actually cooking.
              </p>
              <ul className="space-y-2">
                {['No auto-playing videos', 'No mid-recipe pop-ups', 'No comment sections to scroll past'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-steel text-sm">
                    <i className="fa-solid fa-check text-light-green text-xs" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Row 2, col 3 — Organize */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm flex flex-col gap-5"
          >
            <div className="w-12 h-12 bg-tomato/10 rounded-2xl flex items-center justify-center">
              <i className="fa-solid fa-layer-group text-tomato text-lg" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-cast-iron mb-2">Organize Your Cookbook</h3>
              <p className="text-steel leading-relaxed">Sort by cuisine, meal type, or your own custom categories. Find the right recipe in seconds.</p>
            </div>
          </motion.div>

        </div>
      </div>

    </section>
  );
}
