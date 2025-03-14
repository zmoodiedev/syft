import Image from "next/image";
import Button from "./Button";

export default function Callout() {
    return (
        <div className="w-full min-h-20 py-30 relative z-1">
            <section id="importCallout" className="brand-max-w flex gap-10 flex-col md:flex-row">
                <div className="callout-img w-1/2">
                    <Image
                        src="/hero_meal.png"
                        alt="Whiisk logo"
                        width={640}
                        height={0}
                        priority
                    />
                </div>
                <div className="callout-txt w-1/2 flex flex-col justify-center">
                    <h2><span className="text-3xl block font-thin">Import</span>
                    Online Recipes</h2>
                    <p className="mb-10">Store and sort all of your favorite recipes—whether from cookbooks, websites, or handwritten cards. No ads, no distractions—just the recipes you love.</p>
                    <Button
                        text="Learn More"
                        href="/login"
                        className="blue"
                    />
                </div>
            </section>
        </div>
    )
}