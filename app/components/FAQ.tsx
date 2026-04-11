'use client'

import Question from "./Question";
import { motion } from "framer-motion";
import Link from "next/link";

const faqData = [
  {
    question: "How do I save a recipe from a website?",
    answer: "Copy the URL from any recipe website and paste it into Syft. As long as it isn't blocked, we pull the ingredients, steps, and details automatically. No copying and pasting, no losing recipes when a site goes down or moves behind a paywall."
  },
  {
    question: "How is this different from just bookmarking a recipe?",
    answer: "Bookmarks break when sites change URLs, go down, or get paywalled. Syft saves the actual recipe content. It's yours, it's searchable, it's organized, and there are no ads when you open it."
  },
  {
    question: "What happens when I share a recipe with a friend?",
    answer: "It lands straight in their Syft collection. They get a notification, and the recipe is theirs to keep, cook, and organize. No links, no copy-pasting, no 'did you get my message?'"
  },
  {
    question: "What's the difference between Free and Pro?",
    answer: "Free gives you up to 15 recipes with full save and organize features. Pro removes that limit, unlocks the friends network, and lets you share recipes directly to other users' collections. $3.49/month or $24.99/year."
  },
  {
    question: "Can I add my own recipes, not just ones from websites?",
    answer: "Yes. You can enter recipes from scratch — your own originals, family recipes, or anything from a physical cookbook. Title, ingredients, steps, notes. It's all yours."
  },
  {
    question: "Does Syft work on mobile?",
    answer: "Yes. Syft is a web app that works in any browser on any device. A dedicated mobile app is on the roadmap."
  }
];

export default function FAQ() {
  return (
    <section className="w-full bg-eggshell px-6 py-20 lg:py-32">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* Left column — sticky heading */}
          <motion.div
            className="lg:sticky lg:top-28"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block bg-light-green/10 text-light-green font-semibold text-xs px-3 py-1.5 rounded-full mb-6 border border-light-green/20 uppercase tracking-wider">
              FAQ
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-cast-iron mb-5 leading-tight">
              Got questions?
            </h2>
            <p className="text-steel text-lg leading-relaxed mb-8">
              Everything you need to know about Syft. Can&apos;t find what you&apos;re looking for?
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1 text-light-green font-semibold hover:gap-2 transition-all duration-200"
            >
              Contact us →
            </Link>
          </motion.div>

          {/* Right column — question cards */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {faqData.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <Question question={faq.question} answer={faq.answer} />
              </div>
            ))}
          </motion.div>

        </div>
      </div>
    </section>
  );
}
