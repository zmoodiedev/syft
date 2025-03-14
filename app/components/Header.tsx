import Link from "next/link";
import Image from "next/image";
import Button from "./Button";

export default function Header() {
    return (
        <header className="pt-[40px] pb-[24px] h-[var(--header-height)] relative z-2">
            <div className="w-full brand-max-w flex flex-row justify-between">
                <Link href="/">
                    <Image
                        src="/logo_whiisk.svg"
                        alt="Whiisk logo"
                        width={100}
                        height={0}
                        priority
                    />
                </Link>
                <nav id="guestNav" className="flex flex-row gap-[1rem]">
                <Button
                    text="Login"
                    href="/login"
                />
                    <Button
                        text="Sign Up"
                        href="/login"
                        className="bg-accent"
                    />
                </nav>
            </div>
        </header>
    )
}