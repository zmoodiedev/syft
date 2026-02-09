import "@/app/globals.css";

import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import DemoBanner from "@/app/components/DemoBanner";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <DemoBanner />
    </>
  );
}
