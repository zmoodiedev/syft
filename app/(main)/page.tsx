import { Metadata } from 'next';
import Hero from '@/app/components/Hero';
import Features from '@/app/components/Features';
import CTA from '@/app/components/CTA';
import FAQ from '@/app/components/FAQ';
import HomeRedirect from '@/app/components/HomeRedirect';

export const metadata: Metadata = {
  title: "Syft - Recipe Manager",
  description: "Save, organize, and enjoy your favorite recipes, all in one place.",
};

export default function Home() {
  return (
    <div className="home-wrap">
      <HomeRedirect />
      <Hero />
      <Features />
      <CTA />
      <FAQ />
    </div>
  );
}