import "./Button.css";
import Link from "next/link";

interface ButtonProps {
    text: string;
    href?: string;
    className?: string;
}

export default function Button({ text, href, className = '' }: ButtonProps) {
    return href ? (
        <Link
            className={`btn ${className}`}
            href={href}
        >
            {text}
        </Link>
    ) : (
        <button 
            className={`btn ${className}`}
        >
            {text}
        </button>
    );
}