import Button from "./Button";
import FoodImageBlob from "./FoodImageBlob";

export default function Callout() {
    const foodImagePath = "/images/food_prep.jpg";

    return (
        <div className="w-full min-h-20 px-4 py-20 md:py-50 relative z-1">
            <section id="importCallout" className="container mx-auto flex gap-20 md:gap-40 flex-col md:flex-row">
                <div className="callout-img md:w-1/2 relative min-h-[400px]">
                    <FoodImageBlob 
                        imageSrc={foodImagePath}
                        altText="Food Prep" 
                        width={600}
                        height={600}
                    />
                </div>
                <div className="callout-txt md:w-1/2 flex flex-col justify-center text-left">
                    <h2 className="text-4xl lg:text-5xl mb-4 font-bold">
                    How it Works</h2>
                    <div className="w-16 h-1 bg-tomato mb-8 mx-0"></div>
                    <p className="mb-6">Import recipes from some of your favorite websites, or upload your own family recipes. Adding recipes from the web is easy:</p>
                    <ol className="list-decimal list-inside mb-8 space-y-2">
                        <li className="text-tomato font-medium"><span className="text-cast-iron font-normal">Find a recipe online.</span></li>
                        <li className="text-tomato font-medium"><span className="text-cast-iron font-normal">Copy the link.</span></li>
                        <li className="text-tomato font-medium"><span className="text-cast-iron font-normal">Paste link into the recipe upload field.</span></li>
                        <li className="text-tomato font-medium"><span className="text-cast-iron font-normal">Tweak it to your liking!</span></li>
                    </ol>
                    <Button
                        variant="secondary"
                        className="md:mx-0"
                        href="/login"
                    >Get Started</Button>
                </div>
            </section>
        </div>
    )
}