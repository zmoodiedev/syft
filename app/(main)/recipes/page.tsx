import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'My Recipes',
  };

export default function Page() {
    return (
        <main className="flex flex-col h-full w-full py-20">
          <section id="hero" className="w-full">
            <div className='hero-text w-full brand-max-w relative flex flex-col justify-center'>
                <h1>My Recipes</h1>
              </div>
          </section>
        </main>
    )
}