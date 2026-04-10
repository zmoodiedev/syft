'use client'

import { motion } from "framer-motion";
import FeatureCard from "./FeatureCard";

const features = [
  {
    icon: '🔗',
    title: 'Save Recipes Instantly',
    description: 'Paste a URL and we handle the rest. Extract recipes from thousands of websites, completely ad-free.',
  },
  {
    icon: '📚',
    title: 'Organize Your Cookbook',
    description: 'Sort by cuisine, meal type, or your own custom categories. Find the right recipe in seconds.',
  },
  {
    icon: '👥',
    title: 'Share with Friends',
    description: 'Send recipes directly to friends or make your collection public for everyone to discover.',
  },
  {
    icon: '🍳',
    title: 'Cook Distraction-Free',
    description: 'Just the recipe, nothing else. No scrolling through life stories, no pop-up ads, ever.',
  },
];

export default function Features() {
  return (
    <section className="bg-cast-iron pt-20 lg:pt-32 relative">

      <div className="container mx-auto px-6 pb-24 lg:pb-36 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            So Many Reasons to Love Syft
          </h2>
          <p className="text-white/55 text-lg max-w-2xl mx-auto">
            Everything you need to manage your culinary life, in one clean app.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </div>
      </div>

    </section>
  );
}
