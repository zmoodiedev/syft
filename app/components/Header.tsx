'use client';

import Link from "next/link";
import Image from "next/image";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";

export default function Header() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const isHomePage = pathname === '/';

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/');
        } catch (error) {
            console.error('Failed to log out:', error);
        }
    };

    return (
        <header className={`py-6 h-[var(--header-height)] relative z-2 ${!isHomePage ? 'bg-white' : ''}`}>
            <div className="w-full brand-max-w flex flex-row justify-between items-center">
                <Link href="/">
                    <Image
                        src="/logo_whiisk.svg"
                        alt="Whiisk logo"
                        width={100}
                        height={0}
                        priority
                    />
                </Link>
                {user && (
                    <ul className="flex flex-row gap-6 text-base font-medium">
                        <li>
                            <Link
                                href="/recipes">Your Recipes</Link></li>
                        <li>
                            <Link
                                href="/add-recipe">Add a Recipe</Link></li>
                    </ul>
                )}
                <nav className="flex flex-row gap-[1rem] items-center">
                    {user ? (
                        <>
                            <span className="text-sm text-gray-600">{user.email}</span>
                            <Button
                                text="Logout"
                                onClick={handleLogout}
                                className="bg-accent"
                            />
                        </>
                    ) : (
                        <>
                            <Button
                                text="Login"
                                href="/login"
                            />
                            <Button
                                text="Sign Up"
                                href="/signup"
                                className="bg-accent"
                            />
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}