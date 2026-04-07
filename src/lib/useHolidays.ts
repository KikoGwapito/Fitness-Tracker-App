import { useState, useEffect } from 'react';

export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

const cache: Record<string, Holiday[]> = {};

export function useHolidays(countryCode?: string, year?: number) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryCode || !year) return;

    const cacheKey = `${countryCode}-${year}`;
    if (cache[cacheKey]) {
      setHolidays(cache[cacheKey]);
      return;
    }

    const fetchHolidays = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
        if (response.ok) {
          const data = await response.json();
          cache[cacheKey] = data;
          setHolidays(data);
        }
      } catch (error) {
        console.error('Failed to fetch holidays:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHolidays();
  }, [countryCode, year]);

  return { holidays, loading };
}
