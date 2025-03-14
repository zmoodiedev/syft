import { Reddit_Sans } from "next/font/google";
import "@/app/globals.css";

import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

const redditSans = Reddit_Sans({
  variable: "--font-reddit-sans",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${redditSans.variable} antialiased min-h-full bg-background text-foreground overflow-x-hidden`}
      >
        <Header />
          {children}
        <Footer />
      </body>
    </html>
  );
}
