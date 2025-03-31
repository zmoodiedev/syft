import { Montserrat } from "next/font/google";
import "@/app/globals.css";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DevIndicator from "./components/DevIndicator";
import Script from "next/script";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <Script 
          src="https://kit.fontawesome.com/843ef57212.js" 
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${montserrat.variable} antialiased min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden`}
      >
        <AuthProvider>
          <ProtectedRoute>
            {children}
          </ProtectedRoute>
          <DevIndicator />
        </AuthProvider>
      </body>
    </html>
  );
} 