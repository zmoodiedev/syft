import Image from "next/image";

export default function Footer() {
    return (
        <footer className="bg-dark-blue text-white px-4 pt-16 pb-8 mt-auto">
            <div id="megaFooter" className="container mx-auto mb-16 flex justify-between">
                <div className="md:w-1/3">
                    <Image
                        src="/logo_whiisk.svg"
                        alt="Whiisk logo"
                        width={100}
                        height={27}
                        priority
                        className="brightness-0 invert mb-6 h-auto"
                    />
                    <p className="font-thin text-base">Store and sort all of your favorite recipes—whether from cookbooks, websites, or handwritten cards. No ads, no distractions—just the recipes you love.</p>
                </div>
                <div className="md:w-1/3 text-right">
                    
                </div>
            </div>
            <div id="copyright" className="container mx-auto text-sm font-thin">© {new Date().getFullYear()} Whiisk Co. All rights reserved.</div>
        </footer>
    )
}