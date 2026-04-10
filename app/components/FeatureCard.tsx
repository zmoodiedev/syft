'use client'

import { motion } from "framer-motion";

interface FeatureProps {
  icon: string;
  title: string;
  description: string;
  index: number;
}

export default function FeatureCard({ icon, title, description, index }: FeatureProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col gap-4 hover:bg-white/8 transition-colors cursor-default"
    >
      <span className="text-5xl">{icon}</span>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="text-white/55 leading-relaxed text-base">{description}</p>
    </motion.div>
  );
}
