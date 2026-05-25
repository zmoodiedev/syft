'use client'

import { motion } from "framer-motion";
import TornButton from "./TornButton";

export default function CTA() {
  return (
    <>
      <div className="bg-eggshell">
        <svg
          viewBox="0 0 1440 80"
          fill="#D4883A"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full block"
          style={{ height: '80px', display: 'block', marginBottom: '-1px' }}
        >
          <path d="M0,40 C360,0 1080,80 1440,40 L1440,80 L0,80 Z" />
        </svg>
      </div>

      <section className="bg-tomato pt-12 lg:pt-26 relative">
        <div className="container mx-auto px-6 pb-24 lg:pb-32 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-5 leading-tight">
              Your recipes deserve a better home.
            </h2>
            <p className="text-white/70 text-xl max-w-xl mx-auto mb-10 leading-relaxed">
              Stop losing dishes you love to scattered tabs and screenshots. Save from any website, organize your way, and share straight to a friend&apos;s collection.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center"
            >
              <TornButton href="/signup" variant="secondary">
                Get started for free →
              </TornButton>
            </motion.div>
          </motion.div>
        </div>

        <svg
          viewBox="0 0 1440 80"
          fill="#FAF6EE"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full block"
          style={{ height: '80px', display: 'block', marginBottom: '-1px' }}
        >
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" />
        </svg>
      </section>
    </>
  );
}
