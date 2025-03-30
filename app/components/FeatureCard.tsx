'use client'

import React from 'react';

interface FeatureProps {
    title: string;
    icon: string;
    description: string;
    index?: number;
}

export default function FeatureCard({ title, icon, description, index = 0 }: FeatureProps) {

    // Define unique blob SVG paths for each icon type
    const blobs = {
        'book': (
            <svg width="150" height="150" viewBox="0 0 150 150" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28">
                <path fill="url(#bookGradient)" d="M71.5,17.8C79.9,26,90.3,33.2,90.4,42.7c0.2,9.6-10,21.4-14.9,33.3c-4.9,11.9-4.6,23.9-11.7,30.1 c-7.1,6.2-21.5,6.5-33.6,0.7c-12.1-5.8-21.8-17.7-22.9-30.7C6,63.1,13.4,49.1,21.9,38c8.5-11.1,18.1-19.3,29.5-22.2 C62.8,13,63.1,9.6,71.5,17.8z"/>
                <defs>
                    <linearGradient id="bookGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.15" />
                    </linearGradient>
                </defs>
            </svg>
        ),
        'filter': (
            <svg width="150" height="150" viewBox="0 0 150 150" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28">
                <path fill="url(#filterGradient)" d="M82.5,10.2c7.2,3.9,7.8,15.1,10.9,26.5c3.1,11.4,8.6,23,5.8,31.1c-2.8,8.1-13.8,12.8-23.6,18.2 c-9.8,5.5-18.4,11.6-27.9,12.9c-9.5,1.3-20-2.3-27.7-10.3C12.3,80.5,7.3,68,5.9,54.6C4.5,41.2,6.7,26.8,14.8,17.8 C22.9,8.8,36.8,5.1,50.2,3.8C63.5,2.5,76.1,4.5,82.5,10.2z"/>
                <defs>
                    <linearGradient id="filterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fb7185" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.15" />
                    </linearGradient>
                </defs>
            </svg>
        ),
        'share': (
            <svg width="150" height="150" viewBox="0 0 150 150" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28">
                <path fill="url(#shareGradient)" d="M87.2,27.2c9.3,10.9,15.1,25,11.3,35.2c-3.9,10.2-17.5,16.6-30.5,25c-13,8.4-25.5,18.7-36.6,17.3 c-11.2-1.4-21-14.5-24.3-28.8c-3.3-14.3-0.2-29.9,9.8-41.1C26.9,23.5,43.8,16.7,58.6,13C73.4,9.2,86.1,8.4,96.5,14 C106.9,19.6,87.2,27.2,87.2,27.2z"/>
                <defs>
                    <linearGradient id="shareGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity="0.15" />
                    </linearGradient>
                </defs>
            </svg>
        )
    };
    
    // Get the appropriate blob or default
    const BlobSvg = blobs[icon as keyof typeof blobs] || blobs['book'];
    
    // Calculate animation delay based on index
    const animationDelay = `${index * 0.2}s`;
    
    return (
        <div 
            className="feature-card relative group animate-slideUp opacity-0"
            style={{
                animationDelay,
                animationFillMode: 'forwards'
            }}
        >

            <div className="p-8 h-full bg-white rounded-xl flex flex-col items-center text-center transform transition-all duration-300 hover:-translate-y-1 relative">
                {/* Decorative dots pattern */}
                <div className="absolute top-6 right-6 grid grid-cols-3 gap-1">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-gray-500 rounded-full"></div>
                    ))}
                </div>
                
                {/* Icon with blob background */}
                <div className="relative mb-8 mt-4 w-24 h-24 flex items-center justify-center">
                    {/* Render the blob SVG */}
                    {BlobSvg}

                    {/* Icon */}
                    <div className="relative z-10 text-5xl text-transparent bg-clip-text bg-tomato">
                        <i className={`fa-solid fa-${icon}`}></i>
                    </div>
                </div>
                
                {/* Title and description */}
                <div className="relative">
                    <h3 className="text-2xl font-bold mb-4 text-cast-iron">
                        {title}
                    </h3>
                    
                    {/* Horizontal line */}
                    <div className="h-[2px] w-12 bg-tomato mx-auto mb-6"></div>
                    
                    {/* Description */}
                    <p className="text-steel relative z-10 mb-2">{description}</p>
                </div>
            </div>
        </div>
    )
}