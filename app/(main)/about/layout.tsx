import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'About — Syft',
  description: 'Syft is a recipe manager built by one developer who got tired of bookmarking recipes and losing them. No ads, no bloat.',
  openGraph: {
    title: 'About — Syft',
    description: 'Syft is a recipe manager built by one developer who got tired of bookmarking recipes and losing them. No ads, no bloat.',
    url: 'https://syft.cooking/about',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
