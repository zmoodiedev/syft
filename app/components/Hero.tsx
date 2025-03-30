'use client'

import Button from './Button';
import Image from 'next/image';
import { useRef } from 'react';

export default function Hero() {
    const logoRef = useRef<HTMLObjectElement>(null);

    return (
        <section id="hero" className="w-full p-10  md:min-h-[calc(600px+var(--header-height))] -mt-[var(--header-height)] flex items-stretch isolate relative mt-10 mb-20 z-10">
            <div className='w-full container mx-auto flex justify-end lg:justify-between lg:syft-max-w flex-col-reverse lg:flex-row'>
                <div className="hero-text lg:w-4/5 flex flex-col justify-center py-10 text-center lg:text-left">
                <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-500 font-semibold mb-2 uppercase">Your Own Personal</span>
                    <span className="block text-6xl md:text-7xl lg:text-8xl xl:text-[120px] font-extrabold tracking-tight leading-none mb-4 sm:mb-6 md:mb-8 lg:mb-[2rem]">Recipe Vault</span>
                    <span className="block text-lg md:text-lg lg:text-[1.4rem] mb-6 sm:mb-8 md:mb-10 lg:mb-[3rem] lg:pr-[4rem] lg:max-w-[500px] font-light text-steel">&mdash; Save, organize, and enjoy your favorite recipes, all in one place.</span>
                    <Button
                        variant='secondary'
                        href="/recipes"
                        className="mx-auto text-center lg:mx-0"
                    >Get Started</Button>
                </div>

                <div className="w-full flex flex-col justify-center">
                    {/* Background blob */}
                    <div className='absolute top-40 left-60 lg:top-1/4 lg:left-3/4 xl:left-2/3 transform -translate-x-1/4  -translate-y-2/3 lg:-translate-y-2/3 w-[180vw] max-w-[1800px] -z-10'>
                        <Image
                            src="./images/hero_blob.svg"
                            alt="Blob"
                            width={1500}
                            height={1500}
                            className="select-none w-full h-auto"
                        />
                    </div>
                    
                    {/* Logo positioned on top of the blob */}
                    <div className="z-10">
                        <object
                            ref={logoRef}
                            data="./logo_syft_v.svg"
                            type="image/svg+xml"
                            className="select-none h-auto w-full max-w-[800px]"
                            aria-label="Syft Logo"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}