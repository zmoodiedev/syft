import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Roadmap — Syft',
  description: "See what's shipped and what's coming next. Syft is built in public.",
  openGraph: {
    title: 'Roadmap — Syft',
    description: "See what's shipped and what's coming next. Syft is built in public.",
    url: 'https://syft.cooking/roadmap',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
