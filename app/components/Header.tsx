'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { useState, useEffect } from "react";
import Navbar from "./Navbar";

export default function Header() {
    const pathname = usePathname();
    const isHomePage = pathname === '/';
    const [mounted, setMounted] = useState(false);
    

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);


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
        <header className={`w-full h-[var(--header-height)] p-4 z-[100] ${!isHomePage ? 'bg-white border-b border-gray-100 shadow-sm' : ''} ${isHomePage ? 'absolute' : ''}`}>
            <div className="w-full container mx-auto flex flex-row justify-between items-center h-full">
                <Link href="/">
                    <Logo className="h-[36px] w-auto text-cast-iron" />
                </Link>

                <Navbar />
            </div>
        </header>
    );
}