import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  className?: string;
  fullWidth?: boolean;
  isLoading?: boolean;
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  href, 
  className = '',
  isLoading = false,
  ...props 
}: ButtonProps) {
  
  // Base styles
  const baseStyles = "block font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-blue rounded-md w-[max-content]";
  
  // Size styles
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };
  
  // Variant styles
  const variantStyles = {
    primary: "bg-light-blue text-dark-grey hover:bg-white",
    secondary: "bg-highlight text-gray-800 hover:bg-white",
    outline: "border border-light-blue text-light-blue hover:bg-blue-50",
    ghost: "text-dark-grey hover:bg-dark-grey hover:text-white"
  };
  
  
  // Loading state
  const loadingState = isLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer";
  
  // Combined styles
  const buttonStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${loadingState} ${className}`;
  
  // Loading indicator
  const LoadingIndicator = () => (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
  
  // Render as link or button
  return href ? (
    <Link
      href={href}
      className={buttonStyles}
    >
      {isLoading && <LoadingIndicator />}
      {children}
    </Link>
  ) : (
    <button 
      className={buttonStyles}
      disabled={isLoading}
      {...props}
    >
      {isLoading && <LoadingIndicator />}
      {children}
    </button>
  );
}