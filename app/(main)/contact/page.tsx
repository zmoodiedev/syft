'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

const reasons = [
  { icon: '🐛', label: 'Found a bug' },
  { icon: '💡', label: 'Feature idea' },
  { icon: '💬', label: 'General feedback' },
  { icon: '👋', label: 'Just saying hi' },
];

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Syft contact from ${name}`);
    const body = encodeURIComponent(`From: ${name} <${email}>\n\n${message}`);
    window.location.href = `mailto:contact@syft.cooking?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-eggshell">
      <div className="container mx-auto px-6 pt-20 pb-24 md:pt-28 max-w-5xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block bg-light-green/10 text-light-green font-semibold text-xs px-3 py-1.5 rounded-full mb-6 border border-light-green/20 uppercase tracking-wider">
            Contact
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-cast-iron mb-4">
            Say hello.
          </h1>
          <p className="text-steel text-lg max-w-md mx-auto">
            Found a bug, got an idea, or just want to talk food? We read everything.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-16 items-start">

          {/* Left — reasons */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="md:col-span-2"
          >
            <p className="text-sm font-semibold text-cast-iron mb-4">Good reasons to reach out</p>
            <ul className="space-y-3">
              {reasons.map((r) => (
                <li key={r.label} className="flex items-center gap-3 text-steel text-sm">
                  <span className="text-xl">{r.icon}</span>
                  {r.label}
                </li>
              ))}
            </ul>

            <p className="text-steel text-sm mt-10 leading-relaxed">
              We&apos;re a small operation, so replies might take a day or two. But we do reply.
            </p>
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="md:col-span-3"
          >
            {submitted ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <span className="text-5xl block mb-4">📬</span>
                <h2 className="text-xl font-bold text-cast-iron mb-2">Opening your email client...</h2>
                <p className="text-steel text-sm">
                  If nothing opened,{' '}
                  <a href="mailto:contact@syft.cooking" className="text-light-green font-semibold hover:underline">
                    email us directly.
                  </a>
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-cast-iron mb-1.5">
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="border border-gray-200 rounded-xl w-full py-3 px-4 text-cast-iron text-sm focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-cast-iron mb-1.5">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="border border-gray-200 rounded-xl w-full py-3 px-4 text-cast-iron text-sm focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-cast-iron mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    className="border border-gray-200 rounded-xl w-full py-3 px-4 text-cast-iron text-sm focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors resize-none"
                    placeholder="What's on your mind?"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-light-green text-white py-3 rounded-xl text-sm font-semibold hover:bg-green transition-colors"
                >
                  Send message
                </button>
              </form>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
