import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Contact — Syft',
  description: 'Got a bug report, feature request, or just want to say hi? Reach out to the Syft team.',
  openGraph: {
    title: 'Contact — Syft',
    description: 'Got a bug report, feature request, or just want to say hi? Reach out to the Syft team.',
    url: 'https://syft.cooking/contact',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
