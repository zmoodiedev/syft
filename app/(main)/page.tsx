import { Metadata } from 'next';
import Hero from '@/app/components/Hero';
import Features from '@/app/components/Features';
import CTA from '@/app/components/CTA';
import FAQ from '@/app/components/FAQ';
export const metadata: Metadata = {
  title: "Syft - Recipe Manager",
  description: "Save, organize, and enjoy your favorite recipes, all in one place.",
};

export default function Home() {
  return (
    <div className="home-wrap">
      <Hero />
      <Features />
      <CTA />
      <FAQ />
    </div>
  );
}