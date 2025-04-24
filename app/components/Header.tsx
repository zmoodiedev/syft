'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Navbar from "./Navbar";

export default function Header() {
    const pathname = usePathname();
    const isHomePage = pathname === '/';
    const [mounted, setMounted] = useState(false);
    
    // Handle mounting
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Don't render anything until mounted
    if (!mounted) {
        return (
            <header className={`w-full h-[var(--header-height)] p-4 z-[100] ${!isHomePage ? 'bg-white' : ''} ${isHomePage ? 'absolute' : ''}`}>
                <div className="w-full container mx-auto flex flex-row justify-between items-center h-full">
                    <div className="h-[57px] w-[100px]" />
                    <div className="h-[40px] w-[100px]" />
                </div>
            </header>
        );
    }
    
    return (
        <header className={`w-full h-[var(--header-height)] p-4 z-[100] ${!isHomePage ? 'bg-white' : ''} ${isHomePage ? 'absolute' : ''}`}>
            <div className="w-full container mx-auto flex flex-row justify-between items-center h-full">
                <Link href="/" className="flex items-center">
                    <div className="relative h-[57px] w-[100px]">
                        <Image
                            src="/logo_syft_h.svg"
                            alt="Syft Logo"
                            width={100}
                            height={57}
                            priority
                            className={`h-[57px] w-auto ${isHomePage ? 'hidden' : ''}`}
                            style={{ contain: 'paint' }}
                            aria-label="Syft Logo"
                            data-extension-ignore="true"
                        />
                    </div>
                </Link>

                {/* Use the Navbar component for navigation */}
                <Navbar />
            </div>
        </header>
    );
}