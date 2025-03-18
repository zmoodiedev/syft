import "./Button.css";
import Link from "next/link";

interface ButtonProps {
    text: string;
    onClick?: () => void;
    href?: string;
    className?: string;
}

export default function Button({ text, href, className = '', onClick }: ButtonProps) {
    return href ? (
        <Link
            className={`btn ${className} `}
            href={href}
        >
            {text}
        </Link>
    ) : (
        <button 
            className={`btn ${className} `}
            onClick={onClick}
        >
            {text}
        </button>
    );
}