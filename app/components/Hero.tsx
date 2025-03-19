'use client'

import Button from './Button';
import Image from 'next/image';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useRef } from 'react';

const foodItems = [
    {
        src: '/images/food/pasta.png',
        alt: 'Pasta dish',
        initialX: '50%', // percentage from the right edge
        initialY: 100,
        speed: 0.3,
        scale: 0.8,
        rotate: -15,
        floatOffset: 20,
    },
    {
        src: '/images/food/salad.png',
        alt: 'Fresh salad',
        initialX: '65%', // percentage from the right edge
        initialY: 350,
        speed: 0.5,
        scale: 0.6,
        rotate: 10,
        floatOffset: 15,
    },
    {
        src: '/images/food/dessert.png',
        alt: 'Dessert',
        initialX: '75%', // percentage from the right edge
        initialY: 200,
        speed: 0.7,
        scale: 0.5,
        rotate: -5,
        floatOffset: 25,
    }
];

export default function Hero() {
    const sectionRef = useRef<HTMLElement>(null);
    const { scrollY } = useScroll();
    const springConfig = { stiffness: 100, damping: 30, mass: 0.5 };
    
    // Create smooth spring-based transforms for each food item
    const pastaY = useTransform(scrollY, [0, 600], [foodItems[0].initialY, foodItems[0].initialY + (foodItems[0].speed * 600)]);
    const saladY = useTransform(scrollY, [0, 500], [foodItems[1].initialY, foodItems[1].initialY + (foodItems[1].speed * -200)]);
    const dessertY = useTransform(scrollY, [0, 500], [foodItems[2].initialY, foodItems[2].initialY + (foodItems[2].speed * -200)]);
    
    const springPastaY = useSpring(pastaY, springConfig);
    const springSaladY = useSpring(saladY, springConfig);
    const springDessertY = useSpring(dessertY, springConfig);
    
    const transforms = [springPastaY, springSaladY, springDessertY];

    return (
        <section ref={sectionRef} id="hero" className="w-full min-h-[calc(600px+var(--header-height))] -mt-[var(--header-height)] flex items-stretch isolate overflow-hidden relative">
            <div className='hero-text w-full container mx-auto relative flex flex-col justify-center z-10'>
                <span className="block text-[1.7rem] leading-none font-light">Your favorite</span>
                <span className="block text-[96px] font-bold tracking-tight leading-none mb-[2rem] highlight">Recipes</span>
                <span className="block text-[1.7rem] leading-none pb-[2rem] font-light">No distractions.</span>
                <Button
                    href="/recipes"
                    text="Get Whiisking!"
                    className="bg-light-blue"
                />
            </div>

            {/* Container for food items */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Floating food items */}
                {foodItems.map((item, index) => (
                    <motion.div
                        key={index}
                        className="absolute pointer-events-none right-0"
                        style={{
                            left: item.initialX,
                            y: transforms[index],
                            scale: item.scale,
                            rotate: item.rotate,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: 1,
                            transition: {
                                duration: 1,
                                delay: index * 0.2,
                            }
                        }}
                        transition={{
                            default: {
                                type: "spring",
                                stiffness: 100,
                                damping: 30,
                                mass: 0.5,
                            }
                        }}
                    >
                        <motion.div
                            animate={{
                                y: [0, item.floatOffset, 0],
                            }}
                            transition={{
                                y: {
                                    duration: 4 + index,
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                    ease: "easeInOut",
                                }
                            }}
                        >
                            <Image
                                src={item.src}
                                alt={item.alt}
                                width={200}
                                height={200}
                                className="select-none"
                                priority={index === 0}
                            />
                        </motion.div>
                    </motion.div>
                ))}
            </div>

            <span id="heroLine" className="block bg-light-blue w-96 h-[calc(100%+var(--header-height))] bottom-0 right-10 absolute -skew-x-24 -z-1"></span>
        </section>
    );
}