'use client';

import { useState, useEffect } from 'react';
import { isDev } from '../lib/env';

export default function DevIndicator() {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Only show in client-side rendering and in development mode
    setIsVisible(isDev);
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-medium shadow-md z-50">
      DEV MODE
    </div>
  );
} 