'use client'

import Button from './Button';
import Image from 'next/image';
import { useEffect, useRef } from 'react';

export default function Hero() {

    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (imageRef.current) {
                const scrolled = window.scrollY;
                const translateY = -scrolled * 0.3;
                imageRef.current.style.transform = `translateY(${translateY}px)`;
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section id="hero" className="w-full min-h-[575px] flex items-stretch isolate">
            <div className='hero-text w-full brand-max-w relative flex flex-col justify-center'>
                <span className="block text-[1.7rem] leading-none font-light">Your favorite</span>
                <span className="block text-[96px] font-bold tracking-tight leading-none mb-[2rem] highlight">Recipes</span>
                <span className="block text-[1.7rem] leading-none pb-[2rem] font-light">No distractions.</span>
                <Button
                    href="/login"
                    text="Get Whiisking!"
                    className="blue"
                />
                <Image
                    ref={imageRef}
                    src="/hero_meal.png"
                    alt="Whiisk logo"
                    width={640}
                    height={0}
                    priority
                    className="absolute bottom-0 right-0 transition-transform duration-100 ease-out z-2"
                />
                <span id="heroLine" className="block bg-light-blue w-96 h-[calc(100%+var(--header-height))] bottom-0 right-10 absolute -skew-x-24 -z-1"></span>
            </div>
        </section>
    )
}