'use client';

import Script from 'next/script';

export function FontAwesomeScript() {
  return (
    <Script 
      src="https://kit.fontawesome.com/843ef57212.js" 
      crossOrigin="anonymous"
      strategy="beforeInteractive"
    />
  );
} 