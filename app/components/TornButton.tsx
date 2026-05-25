'use client'

import Link from 'next/link';

interface TornButtonProps {
  children: React.ReactNode;
  /** Renders as a Next.js Link when provided */
  href?: string;
  onClick?: () => void;
  /** primary = amber fill, secondary = white fill */
  variant?: 'primary' | 'secondary';
  className?: string;
}

export default function TornButton({
  children,
  href,
  onClick,
  variant = 'primary',
  className = '',
}: TornButtonProps) {
  const isPrimary = variant === 'primary';

  const layers = (
    <>
      {/* Filter defs — own IDs so they don't conflict with any inline hero defs */}
      <svg className="absolute" style={{ width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          <filter id="torn-btn-a" x="-12%" y="-20%" width="124%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.038" numOctaves="4" seed="5" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="torn-btn-b" x="-12%" y="-20%" width="124%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.038" numOctaves="4" seed="14" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Backing layer — translateY in Tailwind so group-hover can animate it */}
      <div
        className={[
          'absolute inset-0 pointer-events-none',
          'translate-x-[6px] translate-y-[5px]',
          'group-hover:translate-y-[-3px]',
          'transition-transform duration-200 ease-out',
          isPrimary ? 'skew-y-[-2deg]' : 'skew-y-[1.5deg]',
        ].join(' ')}
        style={{
          filter: isPrimary ? 'url(#torn-btn-b)' : 'url(#torn-btn-a)',
          opacity: isPrimary ? 0.38 : 0.35,
        }}
        aria-hidden="true"
      >
        <div className={[
          'w-full h-full rounded-2xl',
          isPrimary ? 'bg-tomato' : 'bg-white border-2 border-stone-300',
        ].join(' ')} />
      </div>

      {/* Main background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          filter: isPrimary
            ? 'url(#torn-btn-a) drop-shadow(0 6px 18px rgba(212,136,58,0.4))'
            : 'url(#torn-btn-b) drop-shadow(0 4px 12px rgba(44,26,14,0.10))',
          transform: isPrimary ? 'skewY(-2deg)' : 'skewY(1.5deg)',
        }}
        aria-hidden="true"
      >
        <div className={[
          'w-full h-full rounded-2xl',
          isPrimary ? 'bg-tomato' : 'bg-white border-2 border-stone-200',
        ].join(' ')} />
      </div>

      {/* Text — crisp, no filter, no skew */}
      <span className={[
        'relative z-10 px-9 py-4 text-lg font-bold',
        'transition-opacity w-full text-center',
        isPrimary
          ? 'text-white group-hover:opacity-90'
          : 'text-cast-iron font-semibold group-hover:opacity-75',
      ].join(' ')}>
        {children}
      </span>
    </>
  );

  const outerClass = [
    'relative flex sm:inline-flex w-full sm:w-auto group',
    className,
  ].join(' ');

  if (href) {
    return (
      <Link href={href} className={outerClass}>
        {layers}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={`${outerClass} cursor-pointer`}>
      {layers}
    </button>
  );
}
