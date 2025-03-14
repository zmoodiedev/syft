import { Metadata } from 'next';
import Hero from '@/app/components/Hero';
import Features from '@/app/components/Features';
import Callout from '@/app/components/Callout';

export const metadata: Metadata = {
  title: "Whiisk - Recipe Manager",
  description: "No life stories, no ads, just recipies",
};

export default function Home() {
  return (
    <div className="home-wrap">
      <Hero />
      <Features />
      <Callout />
    </div>
  );
}