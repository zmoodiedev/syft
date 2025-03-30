'use client'

import FeatureCard from "./FeatureCard";

export default function Features() {
    return (
        <div className="w-full px-6 py-16 lg:py-24 relative z-1 bg-eggshell">
            {/* Geometric shapes and patterns */}
            <div className="absolute inset-0">
                <div className="absolute top-12 left-12 w-32 h-32 border-2 border-red-500/20 rounded-full"></div>
                <div className="absolute bottom-20 right-20 w-24 h-24 border border-rose-500/30"></div>
                <div className="absolute top-32 right-8 w-4 h-4 bg-red-500/30"></div>
                
                {/* Grid pattern */}
                <div className="absolute right-8 top-1/4 grid grid-cols-6 gap-2">
                    {[...Array(24)].map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                    ))}
                </div>
            </div>
            
            <div className="container mx-auto text-center mb-20 relative z-10 animate-slideUp opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
                <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-500 font-semibold mb-2 uppercase">Why Use Syft?</span>
                <h2 className="text-3xl md:text-5xl font-bold mb-4 text-cast-iron">Features You{"'"}ll Love</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">Everything you need to organize your culinary creations in one place.</p>
                <div className="w-16 h-1 bg-tomato mx-auto mt-8"></div>
            </div>
            
            <section id="features" className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
                <FeatureCard
                    icon="book"
                    title="Save Recipes from Anywhere"
                    description="Import recipes from around the internet, without the added fluff."
                    index={0}
                />
                <FeatureCard
                    icon="filter"
                    title="Organize with Categories"
                    description="Filter and Syft through your recipes with categories based on ingredients or meal types."
                    index={1}
                />
                <FeatureCard
                    icon="share"
                    title="Share with Friends"
                    description="Share your recipes with friends, and let them add it to their own. Coming Soon."
                    index={2}
                />
            </section>
        </div>
    )
}