'use client'

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import React from 'react';

const floatingItems = [
  // Large & sharp — foreground feel
  { emoji: '🍝', style: { top: '22%', left: '8%' }  as React.CSSProperties, delay: 0.0, rotate: -15, size: 'text-7xl', blur: 0,   opacity: 0.95 },
  { emoji: '🥑', style: { top: '56%', left: '13%' } as React.CSSProperties, delay: 0.3, rotate: -8,  size: 'text-6xl', blur: 0,   opacity: 0.9  },
  // Medium — mid-ground
  { emoji: '🫐', style: { top: '9%',  right: '13%' } as React.CSSProperties, delay: 0.5, rotate: 12,  size: 'text-5xl', blur: 0.8, opacity: 0.8  },
  { emoji: '🌶️', style: { top: '50%', right: '8%' }  as React.CSSProperties, delay: 0.9, rotate: 15,  size: 'text-5xl', blur: 0.6, opacity: 0.82 },
  { emoji: '🧄', style: { top: '78%', left: '5%' }   as React.CSSProperties, delay: 1.4, rotate: 8,   size: 'text-4xl', blur: 1.2, opacity: 0.7  },
  // Small & blurry — background feel
  { emoji: '🌿', style: { top: '32%', right: '5%' }  as React.CSSProperties, delay: 0.6, rotate: -10, size: 'text-3xl', blur: 2.5, opacity: 0.5  },
  { emoji: '🍋', style: { top: '74%', right: '19%' } as React.CSSProperties, delay: 0.7, rotate: 18,  size: 'text-3xl', blur: 2.5, opacity: 0.45 },
  { emoji: '🍄', style: { top: '14%', left: '21%' }  as React.CSSProperties, delay: 1.1, rotate: -20, size: 'text-2xl', blur: 3,   opacity: 0.4  },
];

const marqueeItems = [
  '🍝 Pasta', '🥗 Salads', '🥘 Stews', '🍰 Desserts',
  '🌮 Tacos', '🍜 Noodles', '🥩 Mains', '🥞 Breakfast',
  '🍕 Pizza', '🧁 Baking', '🫕 Soups', '🥙 Wraps',
];

export default function Hero() {
  const { enterDemoMode } = useAuth();

  return (
    <section className="relative overflow-hidden bg-cream min-h-[88vh] flex flex-col">

      {/* Floating food emojis — hidden on small screens */}
      {floatingItems.map((item, i) => (
        <motion.div
          key={i}
          className="absolute hidden lg:block select-none pointer-events-none"
          style={item.style}
          initial={{ opacity: 0 }}
          animate={{ opacity: item.opacity }}
          transition={{ duration: 0.8, delay: item.delay }}
        >
          <motion.span
            className={`block ${item.size}`}
            style={{
              rotate: item.rotate,
              filter: item.blur > 0 ? `blur(${item.blur}px)` : undefined,
            }}
            animate={{ y: [0, -12, 0] }}
            transition={{
              duration: 3 + i * 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: item.delay + 0.8,
            }}
          >
            {item.emoji}
          </motion.span>
        </motion.div>
      ))}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pt-32 pb-16 relative z-10">
        <div className="text-center max-w-4xl mx-auto">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="inline-block bg-light-green/10 text-light-green font-semibold text-sm px-4 py-1.5 rounded-full mb-8 border border-light-green/25 tracking-wide">
              Your personal recipe vault ✨
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight text-cast-iron mb-6"
          >
            Find it. Save it.<br />
            <span className="text-light-green">Cook it.</span> Share it.
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-xl md:text-2xl text-steel max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Save recipes from anywhere, organize your collection, and share with
            friends — no ads, no distractions, just cooking.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="bg-tomato text-white px-8 py-4 rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl transition-shadow w-full sm:w-auto"
              >
                Start for free →
              </motion.button>
            </Link>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={enterDemoMode}
              className="bg-white text-cast-iron px-8 py-4 rounded-2xl text-lg font-semibold border-2 border-stone-200 hover:border-light-green transition-colors w-full sm:w-auto"
            >
              Try the demo
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Marquee strip */}
      <div className="w-full bg-cast-iron py-4 overflow-hidden relative z-10 shrink-0">
        <div className="animate-marquee">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span
              key={i}
              className="mx-8 text-white/50 font-medium text-base tracking-wide"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
