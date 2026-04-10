'use client'

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';

const marqueeItems = [
  '🍝 Pasta', '🥗 Salads', '🥘 Stews', '🍰 Desserts',
  '🌮 Tacos', '🍜 Noodles', '🥩 Mains', '🥞 Breakfast',
  '🍕 Pizza', '🧁 Baking', '🫕 Soups', '🥙 Wraps',
];

export default function Hero() {
  const { enterDemoMode } = useAuth();

  return (
    <section className="relative overflow-hidden bg-cream min-h-[88vh] flex flex-col">

      {/* Background depth blobs */}
      <div className="absolute top-1/2 right-[2%] -translate-y-1/2 w-[640px] h-[640px] rounded-full bg-tomato/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[15%] left-[0%] w-[400px] h-[400px] rounded-full bg-light-green/8 blur-[100px] pointer-events-none" />

      {/* Main content */}
      <div className="flex-1 flex items-center px-6 pt-28 pb-16 relative z-10">
        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — text */}
          <div className="text-center lg:text-left">

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="inline-block bg-light-green/10 text-light-green font-semibold text-sm px-4 py-1.5 rounded-full mb-8 border border-light-green/25 tracking-wide">
                Your personal recipe vault ✨
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-cast-iron mb-6"
            >
              Find it. Save it.<br />
              <span className="text-light-green">Cook it.</span> Share it.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-xl text-steel max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed"
            >
              Save recipes from anywhere, organize your collection, and share with friends. No ads, no distractions, just cooking.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
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

          {/* Right — mascot */}
          <motion.div
            className="flex justify-center items-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Image
              src="/images/tom_wave.svg"
              alt="Tom, the Syft mascot"
              width={420}
              height={446}
              priority
              className="w-full max-w-[320px] md:max-w-[380px] lg:max-w-[420px] h-auto drop-shadow-xl"
            />
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
