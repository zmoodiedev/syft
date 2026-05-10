'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-eggshell flex flex-col items-center justify-center px-6 text-center">

      {/* Floating Ollie */}
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-8"
      >
        <Image
          src="/images/branding/chef_ollie.png"
          alt="Ollie the Syft mascot"
          width={140}
          height={140}
          priority
        />
      </motion.div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <Image
          src="/images/branding/logo_Syft.svg"
          alt="Syft"
          width={100}
          height={36}
          priority
        />
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="font-display text-4xl md:text-5xl font-bold text-cast-iron mb-4"
        style={{ fontFamily: 'var(--font-baloo_2)' }}
      >
        Something good is cooking.
      </motion.h1>

      {/* Subline */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-steel text-lg max-w-sm leading-relaxed"
      >
        Syft is a recipe manager built for people who actually cook. We&apos;re putting the finishing touches on it now.
      </motion.p>

    </div>
  );
}
