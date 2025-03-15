import { Metadata } from 'next';
import CategoryFilter from '@/app/components/CategoryFilter';
import RecipeList from '@/app/components/RecipeList';


export const metadata: Metadata = {
    title: 'My Recipes',
  };

export default function Page() {
    return (
        <main className="flex flex-col h-full w-full py-20">
          <section id="hero" className="w-full">
            <div className='hero-text w-full brand-max-w relative flex flex-col justify-center'>
                <h1 className="mb-6">My Recipes</h1>
                <CategoryFilter />
                <RecipeList />
              </div>
          </section>
        </main>
    )
}