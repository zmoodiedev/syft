import Image from "next/image";
import Button from "./Button";

export default function Callout() {

    return (
        <div className="w-full min-h-20 px-4 py-20 md:py-50 relative z-1 overflow-hidden">
            <section id="callout" className="container mx-auto flex md:gap-30 flex-col md:flex-row relative overflow-visible">
                {/* Background blob */}
                <div className='absolute -top-40 -left-80 w-[800px] h-[800px] -z-10 opacity-10'>
                    <Image
                        src="/images/hero_blob.svg"
                        alt="Blob"
                        fill
                        className="select-none object-contain"
                        priority
                    />
                </div>
                <div className="callout-img md:w-1/2 relative min-h-[400px]">
                    <Image
                        src="/images/tom_spaghetti.svg"
                        alt="Tom Spaghetti" 
                        width={0}
                        height={0}
                        className="relative z-10 w-auto h-auto"
                    />
                </div>
                <div className="callout-txt w-full lg:w-3/4 flex flex-col justify-center text-left">
                    <h2 className="text-4xl lg:text-5xl mb-4 font-bold">
                    How it Works</h2>
                    <div className="w-16 h-1 bg-tomato mb-8 mx-0"></div>
                    <p className="mb-6">Import recipes from some of your favorite websites, or upload your own family recipes. Adding recipes from the web is easy:</p>
                    <div className="pl-4">
                        <ol className="list-decimal list-inside mb-8 space-y-2">
                            <li className="text-tomato font-medium"><span className="text-cast-iron font-normal">Find a recipe online.</span></li>
                            <li className="text-tomato font-medium"><span className="text-cast-iron font-normal">Copy the link.</span></li>
                            <li className="text-tomato font-medium"><span className="text-cast-iron font-normal">Paste the link into the recipe upload field.</span></li>
                            <li className="text-tomato font-medium"><span className="text-cast-iron font-normal">Tweak it to your liking!</span></li>
                        </ol>
                    </div>
                    <Button
                        variant="secondary"
                        className="md:mx-0"
                        href="/recipes"
                    >Get Started</Button>
                </div>
            </section>
        </div>
    )
}