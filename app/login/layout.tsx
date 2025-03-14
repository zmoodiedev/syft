import { Reddit_Sans } from "next/font/google";
import "@/app/globals.css";

const redditSans = Reddit_Sans({
  variable: "--font-reddit-sans",
  subsets: ["latin"],
});

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${redditSans.variable} antialiased h-100vh bg-light-grey text-foreground overflow-x-hidden`}
      >
          {children}
      </body>
    </html>
  );
}
