'use client'

import { motion } from "framer-motion";
import Link from "next/link";

export default function CTA() {
  return (
    <>
      {/* Wave: cast-iron → tomato. Owned here so the fill always matches the section below */}
      <div className="bg-cast-iron">
        <svg
          viewBox="0 0 1440 80"
          fill="#EB5D31"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full block"
          style={{ height: '80px', display: 'block', marginBottom: '-1px' }}
        >
          <path d="M0,40 C360,0 1080,80 1440,40 L1440,80 L0,80 Z" />
        </svg>
      </div>

      <section className="bg-tomato pt-12 lg:pt-16 relative">
        <div className="container mx-auto px-6 pb-24 lg:pb-32 max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Ready to cook smarter?
            </h2>
            <p className="text-white/75 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Join home cooks who&apos;ve ditched the recipe chaos. Organize everything in one place — it&apos;s free to start.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link href="/signup">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-white text-tomato px-10 py-4 rounded-2xl text-lg font-bold shadow-xl hover:shadow-2xl transition-shadow"
                >
                  Get started for free →
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Wave: tomato → eggshell */}
        <svg
          viewBox="0 0 1440 80"
          fill="#FAFAF9"
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
