'use client'

import Link from 'next/link';

interface ScrollToTopLinkProps extends React.ComponentProps<typeof Link> {
    children: React.ReactNode;
}

export default function ScrollToTopLink({ children, ...props }: ScrollToTopLinkProps) {
    const handleClick = () => {
        window.scrollTo(0, 0);
    };

    return (
        <Link {...props} onClick={handleClick}>
            {children}
        </Link>
    );
} 