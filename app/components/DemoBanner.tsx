'use client';

import { useAuth } from '../context/AuthContext';

export default function DemoBanner() {
    const { isDemo, exitDemoMode } = useAuth();

    if (!isDemo) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-tomato text-white py-3 px-4 z-[200] flex items-center justify-center gap-4 text-sm md:text-base shadow-lg">
            <span>You are viewing Syft in demo mode</span>
            <button
                onClick={() => exitDemoMode('/signup')}
                className="bg-white text-tomato font-semibold px-4 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
                Sign up for free
            </button>
        </div>
    );
}
