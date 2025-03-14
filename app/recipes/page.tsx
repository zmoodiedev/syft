import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'My Recipes',
  };

export default function Page() {
    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-full p-8 pb-20 gap-16 font-[family-name:var(--font-geist-sans)]">
          <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
            <h1>Recipes</h1>
            
          </main>
        </div>
    )
}