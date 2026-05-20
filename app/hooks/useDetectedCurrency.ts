import { useState, useEffect } from 'react';

export type Currency = 'USD' | 'CAD';

export function useDetectedCurrency(): [Currency, (c: Currency) => void] {
  const [currency, setCurrency] = useState<Currency>('USD');

  useEffect(() => {
    fetch('/api/geo')
      .then(res => res.json())
      .then(({ country }) => { if (country === 'CA') setCurrency('CAD'); })
      .catch(() => {});
  }, []);

  return [currency, setCurrency];
}
