import Image from "next/image";
import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-cast-iron text-white px-4 pt-16 pb-8 mt-auto z-10">
            <div id="megaFooter" className="container mx-auto mb-16 flex justify-between flex-col md:flex-row">
                <div className="w-full md:w-1/3 mb-10 md:mb-0">
                    <div className="mb-6">
                        <Image
                            src="/logo_syft_h.svg"
                            alt="Syft logo"
                            width={0}
                            height={0}
                            priority
                            className="h-[50px] w-auto"
                        />
                    </div>
                    <p className="font-thin text-base">— Save, organize, and enjoy your favorite recipes, all in one place. No ads, no distractions—just the recipes you love.</p>
                </div>
                <div className="w-full md:w-1/3">
                    <div className="flex flex-row gap-8 text-3xl md:justify-end">
                        <Link href="https://bsky.app/profile/syft-cooking.bsky.social" target="_blank"><i className="fa-brands fa-bluesky"></i></Link>
                        <Link href="https://www.instagram.com/syft.cooking" target="_blank"><i className="fa-brands fa-instagram"></i></Link>
                    </div>
                </div>
            </div>
            <div id="copyright" className="container mx-auto text-sm font-thin py-4">© {new Date().getFullYear()} Syft. All rights reserved.</div>
        </footer>
    )
}