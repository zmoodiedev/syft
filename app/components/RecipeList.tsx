import Image from 'next/image';
import Button from './Button';

export default function RecipeList() {
    return (
        <section id="recipeList" className="grid grid-cols-3 gap-8 gap-y-12 relative">
            <div className="rounded-[.5rem] grid grid-cols-[repeat(10, 1fr)] grid-rows-[repeat(3, 1fr) repeat(2, 2fr)]">
                <div className="col-start-1 col-end-11 row-start-1 row-end-4 bg-white relative h-60">
                    <Image 
                        src="/sticky-toffee-pudding.jpg"
                        alt="Sticky Toffee Pudding"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover rounded-[.5rem]"
                    />
                </div>
                <div className="z-1 col-start-2 col-end-10 row-start-3 row-end-6 bg-white p-6 pt-2 rounded-[.5rem] shadow-lg text-center">
                    <h3 className="mb-3">Sticky Toffee Pudding</h3>
                    <div className="flex flex-row gap-4 text-center mb-6">
                        <div className="w-1/2">
                            <span className="block text-xl font-bold">6</span> servings</div>
                        <div className="w-1/2"><span className="block text-xl font-bold">25</span> minutes</div>
                    </div>
                    <Button
                        href="#"
                        className="bg-light-blue min-w-full"
                    >View Recipe</Button>
                </div>
            </div>
            
            <div className="rounded-[.5rem] grid grid-cols-[repeat(10, 1fr)] grid-rows-[repeat(2, 2fr) repeat(3, 1fr)]">
                <div className="col-start-1 col-end-11 row-start-1 row-end-5 bg-white relative h-60">
                    <Image 
                        src="/sticky-toffee-pudding.jpg"
                        alt="Sticky Toffee Pudding"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover rounded-[.5rem]"
                    />
                </div>
                <div className="z-1 col-start-2 col-end-10 row-start-4 row-end-6 bg-white p-6 pt-2 rounded-[.5rem] shadow-lg text-center">
                    <h3 className="mb-3">Sticky Toffee Pudding</h3>
                    <div className="flex flex-row gap-4 text-center mb-6">
                        <div className="w-1/2">
                            <span className="block text-xl font-bold">6</span> servings</div>
                        <div className="w-1/2"><span className="block text-xl font-bold">25</span> minutes</div>
                    </div>
                    <Button
                        href="#"
                        className="bg-light-blue min-w-full"
                    >View Recipe</Button>
                </div>
            </div>
        </section>
    )
}