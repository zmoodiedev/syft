'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { usePWAInstall } from '@/app/hooks/usePWAInstall';
import { useAuth } from '@/app/context/AuthContext';

export default function Hero() {
  const { canInstall, isIOS, triggerInstall } = usePWAInstall();
  const { user } = useAuth();
  const [showIOSHint, setShowIOSHint] = useState(false);

  return (
    <section className="relative overflow-hidden bg-cream min-h-[88vh] flex flex-col">

      {/* SVG filter definitions — torn paper edge effect for buttons */}
      <svg className="absolute" style={{ width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          {/* Primary button tear — seed 5 */}
          <filter id="torn-a" x="-12%" y="-20%" width="124%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.038" numOctaves="4" seed="5" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* Secondary button tear — seed 14, slightly different character */}
          <filter id="torn-b" x="-12%" y="-20%" width="124%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.038" numOctaves="4" seed="14" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className="absolute inset-0 z-0">
        <Image
          src="/images/branding/kitchen.png"
          alt=""
          fill
          className="object-cover object-right-bottom opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-cream via-cream/90 to-cream/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-cream/60 to-transparent" style={{ bottom: '70%' }} />
      </div>

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
              className="text-5xl md:text-6xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-cast-iron mb-6"
            >
              Find&nbsp;it. Save&nbsp;it.<br />
              <span className="text-tomato">Cook&nbsp;it.</span> Share&nbsp;it.
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
              className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start"
            >
              {/* Primary — Start for free / Add a recipe */}
              <Link href={user ? '/add-recipe' : '/login'} className="relative flex sm:inline-flex w-full sm:w-auto group">
                <div
                  className="absolute inset-0 pointer-events-none skew-y-[-2deg] translate-x-[6px] translate-y-[5px] group-hover:translate-y-[-3px] transition-transform duration-200 ease-out"
                  style={{ filter: 'url(#torn-b)', opacity: 0.38 }}
                  aria-hidden="true"
                >
                  <div className="bg-tomato w-full h-full rounded-2xl" />
                </div>
                {/* Main background */}
                <div
                  className="absolute inset-0 pointer-events-none skew-y-[-2deg]"
                  style={{ filter: 'url(#torn-a) drop-shadow(0 6px 18px rgba(212,136,58,0.4))' }}
                  aria-hidden="true"
                >
                  <div className="bg-tomato w-full h-full rounded-2xl" />
                </div>
                <span className="relative z-10 text-white px-9 py-4 text-lg font-bold group-hover:opacity-90 transition-opacity w-full text-center sm:text-left">
                  {user ? 'Add a recipe →' : 'Start for free →'}
                </span>
              </Link>

              {/* PWA install — mobile/tablet only, hidden on desktop */}
              {canInstall && (
                <div className="relative lg:hidden">
                  <button
                    onClick={() => isIOS ? setShowIOSHint(h => !h) : triggerInstall()}
                    className="flex sm:inline-flex w-full sm:w-auto items-center justify-center gap-2 px-7 py-4 rounded-2xl border-2 border-cast-iron/20 text-cast-iron font-semibold text-base hover:border-cast-iron/40 hover:bg-cast-iron/5 transition-colors"
                  >
                    <i className="fa-solid fa-download text-sm" />
                    Add to home screen
                  </button>

                  <AnimatePresence>
                    {showIOSHint && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 right-0 sm:left-auto sm:right-auto sm:w-64 top-full mt-2 bg-cast-iron text-white text-sm rounded-2xl px-4 py-3 shadow-lg z-10"
                      >
                        <p className="font-semibold mb-1">Install on iPhone</p>
                        <p className="text-white/70 leading-snug">
                          Tap the <span className="font-semibold text-white">Share</span> button at the bottom of Safari, then <span className="font-semibold text-white">Add to Home Screen</span>.
                        </p>
                        <div className="absolute -top-1.5 left-8 w-3 h-3 bg-cast-iron rotate-45 rounded-sm" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

            </motion.div>

          </div>

          <motion.div
            className="flex justify-center items-end"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Image
              src="/images/branding/chef_ollie.png"
              alt="Ollie, the Syft mascot"
              width={560}
              height={620}
              priority
              className="w-full max-w-[360px] md:max-w-[480px] lg:max-w-[560px] h-auto drop-shadow-2xl"
            />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
