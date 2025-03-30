import Image from "next/image";

export default function Footer() {
    return (
        <footer className="bg-cast-iron text-white px-4 pt-16 pb-8 mt-auto">
            <div id="megaFooter" className="container mx-auto mb-16 flex justify-between">
                <div className="md:w-1/3">
                    <Image
                        src="/logo_syft_h.svg"
                        alt="Syft logo"
                        width={150}
                        height={27}
                        priority
                        className="mb-6 h-auto"
                    />
                    <p className="font-thin text-base">— Save, organize, and enjoy your favorite recipes, all in one place. No ads, no distractions—just the recipes you love.</p>
                </div>
                <div className="md:w-1/3 text-right">
                    <div className="flex flex-row gap-8 text-3xl justify-end">
                        <i className="fa-brands fa-bluesky"></i>
                        <i className="fa-brands fa-instagram"></i>
                        <i className="fa-brands fa-facebook"></i>
                    </div>
                </div>
            </div>
            <div id="copyright" className="container mx-auto text-sm font-thin">© {new Date().getFullYear()} Syft. All rights reserved.</div>
        </footer>
    )
}