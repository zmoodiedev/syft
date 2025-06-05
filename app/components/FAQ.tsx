'use client'

import Question from "./Question";
import { motion } from "framer-motion";

const faqData = [
    {
        question: "What is Syft and how does it work?",
        answer: "Syft is a smart recipe management app that helps you organize, save, and share your favorite recipes. You can easily add recipes from websites, create your own, and organize them into collections for easy access."
    },
    {
        question: "Is Syft free to use?",
        answer: "Yes! Syft offers a free tier that includes basic recipe management features. We also offer premium plans with advanced features like meal planning, grocery lists, and enhanced sharing capabilities."
    },
    {
        question: "Can I import recipes from other websites?",
        answer: "Absolutely! Syft can automatically extract recipe information from most popular cooking websites. Just paste the URL and we'l do the rest, saving you time from manual entry."
    },
    {
        question: "How do I share recipes with friends and family?",
        answer: "You can easily share recipes through direct links, social media, or by inviting others to view your recipe collections. Recipients don't need a Syft account to view shared recipes."
    },
    {
        question: "Can I organize my recipes into categories?",
        answer: "Yes! You can create custom collections and tags to organize your recipes by cuisine type, meal category, dietary restrictions, or any system that works for you."
    },
    {
        question: "Is my recipe data secure and private?",
        answer: "Your privacy is our priority. All your recipes are securely stored and only accessible to you unless you choose to share them. We never share your personal data with third parties."
    }
];

export default function FAQ() {
    return (
        <div className="w-full px-6 py-20 lg:py-32 relative z-1">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="container mx-auto text-center mb-16 relative z-10"
            >
                <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-4xl md:text-5xl font-bold mb-6 text-basil"
                >
                    Frequently Asked Questions
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-lg text-gray-600 max-w-2xl mx-auto"
                >
                    Got questions? We&apos;ve got answers. Find everything you need to know about Syft.
                </motion.p>
            </motion.div>
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="container mx-auto max-w-4xl relative z-10"
            >
                <div className="p-8">
                    {faqData.map((faq, index) => (
                        <Question
                            key={index}
                            question={faq.question}
                            answer={faq.answer}
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    )
}