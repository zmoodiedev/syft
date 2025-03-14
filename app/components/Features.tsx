import FeatureCard from "./FeatureCard";

export default function Features() {
    return (
        <div className="w-full min-h-20 bg-light-grey py-18 relative z-1">
            <section id="features" className="brand-max-w flex gap-20 flex-col md:flex-row">
                <FeatureCard
                    image="./icon_import.svg"
                    title="Import Recipes"
                    description="Import recipes from around the internet, without the added fluff."
                />
                <FeatureCard
                    image="./icon_favorites.svg"
                    title="Store Your Favorites"
                    description="Clear up cupboard space by uploading your family recipes or cookbook meals."
                />
                <FeatureCard
                    image="./icon_lists.svg"
                    title="Shopping Lists"
                    description="Coming Soon! Compose shopping lists based on your favorite recipes."
                />
            </section>
        </div>
    )
}