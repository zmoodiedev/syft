import { useState, useEffect } from 'react';

export type Currency = 'USD' | 'CAD';

export function useDetectedCurrency(): [Currency, (c: Currency) => void] {
  const [currency, setCurrency] = useState<Currency>('USD');

  useEffect(() => {
    fetch('https://ipapi.co/country_code/')
      .then(res => res.text())
      .then(code => { if (code.trim() === 'CA') setCurrency('CAD'); })
      .catch(() => {});
  }, []);

  return [currency, setCurrency];
}
