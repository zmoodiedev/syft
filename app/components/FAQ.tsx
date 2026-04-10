'use client'

import Question from "./Question";
import { motion } from "framer-motion";
import Link from "next/link";

const faqData = [
  {
    question: "What is Syft and how does it work?",
    answer: "Syft is a smart recipe management app that helps you organize, save, and share your favorite recipes. Add recipes from websites by pasting a URL, create your own from scratch, and organize them into categories for easy access."
  },
  {
    question: "Is Syft free to use?",
    answer: "Yes! Syft offers a free tier that includes core recipe management features. We also offer a Pro plan with unlimited recipes, advanced sharing, and the friends network."
  },
  {
    question: "Can I import recipes from other websites?",
    answer: "Absolutely. Syft automatically extracts recipe data from most popular cooking websites — just paste the URL and we handle the rest. No ads, no blog posts, just the recipe."
  },
  {
    question: "How do I share recipes with friends?",
    answer: "Add friends by searching their username, then share recipes directly with them. You can also set individual recipes to public so anyone with the link can view them."
  },
  {
    question: "Can I organize my recipes into categories?",
    answer: "Yes — create custom categories and tag recipes by cuisine, meal type, dietary restriction, or whatever system works for you. Filtering is built right into your recipe library."
  },
  {
    question: "Is my recipe data secure and private?",
    answer: "Your privacy is our priority. All recipes are securely stored and only visible to you unless you explicitly share them. We never share your personal data with third parties."
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
