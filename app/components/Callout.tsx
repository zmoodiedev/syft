import Image from "next/image";
import Button from "./Button";

export default function Callout() {
    return (
        <div className="w-full min-h-20 px-4 py-20 md:py-30 relative z-1">
            <section id="importCallout" className="container mx-auto flex gap-10 flex-col md:flex-row">
                <div className="callout-img md:w-1/2">
                    <Image
                        src="/hero_meal.png"
                        alt="Whiisk logo"
                        width={640}
                        height={480}
                        priority
                        className="w-full h-auto"
                    />
                </div>
                <div className="callout-txt md:w-1/2 flex flex-col justify-center text-center md:text-left">
                    <h2 className="text-5xl mb-4"><span className="text-3xl block font-thin">Import</span>
                    Online Recipes</h2>
                    <p className="mb-10">Store and sort all of your favorite recipes—whether from cookbooks, websites, or handwritten cards. No ads, no distractions—just the recipes you love.</p>
                    <Button
                        className="mx-auto md:mx-0"
                        href="/login"
                    >Learn More</Button>
                </div>
            </section>
        </div>
    )
}