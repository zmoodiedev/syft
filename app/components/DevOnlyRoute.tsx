import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DevOnlyRouteProps {
  children: ReactNode;
  fallbackPath?: string;
}

export default function DevOnlyRoute({ 
  children, 
  fallbackPath = '/' 
}: DevOnlyRouteProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    
    // Check if we're not in development mode
    if (process.env.NODE_ENV !== 'development') {
      router.push(fallbackPath);
    }
  }, [router, fallbackPath]);

  // Don't render anything during SSR to prevent flashing content
  if (!isClient) return null;
  
  // Only render children if in development
  return process.env.NODE_ENV === 'development' ? <>{children}</> : null;
} 