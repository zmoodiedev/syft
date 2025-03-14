import Image from "next/image";

export default function Footer() {
    return (
        <footer className="bg-dark-blue text-white pt-16 pb-8 mt-auto">
            <div id="megaFooter" className="brand-max-w mb-16 flex justify-between">
                <div className="w-1/3">
                    <Image
                        src="/logo_whiisk.svg"
                        alt="Whiisk logo"
                        width={100}
                        height={0}
                        priority
                        className="brightness-0 invert mb-6"
                    />
                    <p className="font-thin text-base">Store and sort all of your favorite recipes—whether from cookbooks, websites, or handwritten cards. No ads, no distractions—just the recipes you love.</p>
                </div>
                <div className="w-1/3 text-right">
                    Socials
                </div>
            </div>
            <div id="copyright" className="brand-max-w text-sm font-thin">© 2025 Whiisk Co.</div>
        </footer>
    )
}