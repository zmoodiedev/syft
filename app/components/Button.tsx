'use client'

import { ButtonHTMLAttributes } from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    isLoading?: boolean;
    href?: string;
    size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-basil text-white hover:bg-basil-600 active:bg-basil-700',
    secondary: 'bg-green-apple-500 text-white hover:bg-green-apple-600 active:bg-green-apple-700',
    outline: 'border-2 border-basil text-basil hover:bg-basil hover:text-white active:bg-basil active:text-white',
    ghost: 'text-basil-500 hover:bg-basil-50 active:bg-basil-100'
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
};

export default function Button({ 
    variant = 'primary', 
    className = '', 
    isLoading = false,
    href,
    size = 'md',
    children,
    ...props 
}: ButtonProps) {
    const buttonClassName = `
        inline-flex items-center justify-center gap-2
        rounded-lg font-medium
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
    `;

    if (href) {
        return (
            <Link href={href} className={buttonClassName}>
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                    children
                )}
            </Link>
        );
    }

    return (
        <button
            className={buttonClassName}
            disabled={isLoading}
            {...props}
        >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                children
            )}
        </button>
    );
}