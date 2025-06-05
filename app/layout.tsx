import { Poppins } from "next/font/google";
import { Baloo_2 } from "next/font/google";
import "@/app/globals.css";
import Script from "next/script";
import { Metadata, Viewport } from 'next';
import ClientLayout from './components/ClientLayout';
import { FontAwesomeScript } from '@/app/components/FontAwesome';

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const baloo_2 = Baloo_2({
  variable: "--font-baloo_2",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || '';

// Viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Metadata for the entire site
export const metadata: Metadata = {
  metadataBase: new URL('https://syft.cooking'),
  title: 'Syft - Recipe Manager',
  description: 'Syft helps you organize your recipes and plan your meals.',
  keywords: ['recipe manager', 'recipe organizer', 'cooking', 'recipes', 'food', 'meal planning'],
  authors: [{ name: 'Syft' }],
  creator: 'Syft',
  publisher: 'Syft',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16' },
      { url: '/favicon-32x32.png', sizes: '32x32' }
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://syft.cooking',
    siteName: 'Syft',
    title: 'Syft - Your Personal Recipe Vault',
    description: 'Save, organize, and enjoy your favorite recipes, all in one place. No ads, no distractions—just the recipes you love.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Syft - Your Personal Recipe Vault',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Syft - Your Personal Recipe Vault',
    description: 'Save, organize, and enjoy your favorite recipes, all in one place. No ads, no distractions—just the recipes you love.',
    images: ['/twitter-image.jpg'],
    creator: '@syft_app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <link rel="canonical" href="https://syft.cooking" />
        <meta name="theme-color" content="#ffffff" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <Script 
          src="https://kit.fontawesome.com/843ef57212.js" 
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <FontAwesomeScript />
      </head>
      <body
        className={`${poppins.variable} ${baloo_2.variable} antialiased min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden`}
      >
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
} 