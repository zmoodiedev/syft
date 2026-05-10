import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Pricing — Syft',
  description: 'Simple, honest pricing. Free up to 15 recipes. Go Pro for unlimited recipes, friends, and recipe sharing.',
  openGraph: {
    title: 'Pricing — Syft',
    description: 'Simple, honest pricing. Free up to 15 recipes. Go Pro for unlimited recipes, friends, and recipe sharing.',
    url: 'https://syft.cooking/pricing',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
