import { useState, useEffect } from 'react';

export function useIsIOS(): boolean {
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        setIsIOS(
            /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        );
    }, []);

    return isIOS;
}
