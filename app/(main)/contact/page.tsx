'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

const reasons = [
  { icon: 'fa-bug',         iconColor: 'text-tomato',       bgColor: 'bg-tomato/10',       label: 'Found a bug' },
  { icon: 'fa-lightbulb',   iconColor: 'text-light-green',  bgColor: 'bg-light-green/10',  label: 'Feature idea' },
  { icon: 'fa-comments',    iconColor: 'text-white/70',      bgColor: 'bg-white/10',        label: 'General feedback' },
  { icon: 'fa-face-smile',  iconColor: 'text-white/70',      bgColor: 'bg-white/10',        label: 'Just saying hi' },
];

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-eggshell">
      <div className="container mx-auto px-4 sm:px-6 pt-20 pb-24 md:pt-28 max-w-6xl">

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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="md:col-span-2 bg-cast-iron rounded-3xl p-8 flex flex-col gap-8"
          >
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Good reasons to reach out</h2>
              <p className="text-white/45 text-sm">All messages welcome.</p>
            </div>

            <ul className="space-y-3">
              {reasons.map((r) => (
                <li key={r.label} className="flex items-center gap-3">
                  <div className={`w-9 h-9 ${r.bgColor} rounded-xl flex items-center justify-center shrink-0`}>
                    <i className={`fa-solid ${r.icon} ${r.iconColor} text-sm`} />
                  </div>
                  <span className="text-white/70 text-sm">{r.label}</span>
                </li>
              ))}
            </ul>

            <p className="text-white/35 text-sm leading-relaxed mt-auto">
              We&apos;re a small operation, so replies might take a day or two. But we do reply.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="md:col-span-3"
          >
            {submitted ? (
              <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-10 text-center">
                <div className="w-14 h-14 bg-light-green/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <i className="fa-solid fa-envelope-open text-light-green text-xl" />
                </div>
                <h2 className="text-xl font-bold text-cast-iron mb-2">Message sent!</h2>
                <p className="text-steel text-sm">
                  Thanks for reaching out. We&apos;ll get back to you within a day or two.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-3xl border border-stone-100 shadow-sm p-8 space-y-5"
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
                      className="border border-stone-200 rounded-xl w-full py-3 px-4 text-cast-iron text-sm focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
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
                      className="border border-stone-200 rounded-xl w-full py-3 px-4 text-cast-iron text-sm focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
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
                    rows={6}
                    className="border border-stone-200 rounded-xl w-full py-3 px-4 text-cast-iron text-sm focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors resize-none"
                    placeholder="What's on your mind?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-light-green text-white py-3 rounded-xl text-sm font-semibold hover:bg-green transition-colors disabled:opacity-60"
                >
                  {sending ? 'Sending...' : 'Send message'}
                </button>
              </form>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
