import Image from "next/image";
import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-green text-white mt-auto z-10">
            <div id="megaFooter" className="container mx-auto px-4 py-10 md:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 lg:gap-16">
                <div className="sm:col-span-2 lg:col-span-1">
                    <div className="mb-4">
                        <Image
                            src="/logo_syft_h_white.svg"
                            alt="Syft logo"
                            width={0}
                            height={0}
                            priority
                            className="h-[60px] md:h-[80px] w-auto"
                        />
                    </div>
                    <p className="font-thin text-sm">— Store and sort all of your favorite recipes whether from cookbooks, websites, or handwritten cards. No ads, no distractions, just the recipes you love.</p>
                </div>
                <div>
                    <h5 className="text-lg font-bold">Syft — Recipe Manager</h5>
                    <ul className="text-sm">
                        <li><Link href="/who-we-are">Who We Are</Link></li>
                        <li><Link href="/pricing">Pricing</Link></li>
                        <li><Link href="/roadmap">Roadmap</Link></li>
                        <li><Link href="/contact">Contact</Link></li>
                    </ul>
                </div>
                <div>
                    <h5 className="text-lg font-bold">Connect with Syft</h5>
                    <p className="text-sm">Follow us online for recipes and more!</p>
                </div>
                <div>
                    <h5 className="text-lg font-bold">Join our newsletter</h5>
                    <p className="text-sm">Get notified of new features, and more!</p>
                </div>
            </div>
            <div id="copyright" className="text-sm font-thin py-4 px-4 bg-light-green">
                <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
                    <span>© {new Date().getFullYear()} Syft. All rights reserved.</span>
                    <span><Link href="/terms-of-service">Terms</Link> | <Link href="/privacy-policy">Privacy</Link> | <Link href="/cookie-preferences">Cookies</Link></span>
                </div>
            </div>
        </footer>
    )
}