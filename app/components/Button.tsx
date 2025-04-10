import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
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
  const baseStyles = "flex items-center justify-center text-sm px-6 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-blue rounded-full w-[max-content] after:ease-in-out";
  
  // Size styles
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };
  
  // Variant styles
  const variantStyles = {
    primary: "border-1 border-green-apple text-castiron hover:bg-green-apple",
    secondary: "bg-tomato text-eggshell rounded-tl-full rounded-br-full rounded-tr-none rounded-bl-none uppercase text-xs px-8 py-3 relative inline-block after:absolute after:block after:bg-transparent after:-z-1 after:rounded-tl-full after:rounded-br-full after:rounded-tr-none after:rounded-bl-none after:w-full after:h-full after:-right-1 after:-bottom-[5px] after:border-2 after:border-tomato hover:after:bottom-0 hover:after:right-0 after:transition-all after:duration-300 after:ease-in-out",
    outline: "border-1 border-tomato text-white hover:bg-tomato",
    ghost: "",
    danger: "bg-tomato text-white hover:bg-tomato/80"
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