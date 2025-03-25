'use client';
import { Reddit_Sans } from "next/font/google";
import "@/app/globals.css";
import { AuthProvider } from "./context/AuthContext";
import DevIndicator from "./components/DevIndicator";

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
        className={`${redditSans.variable} antialiased min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden`}
      >
        <AuthProvider>
          {children}
          <DevIndicator />
        </AuthProvider>
      </body>
    </html>
  );
} 