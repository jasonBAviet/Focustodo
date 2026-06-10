import { useState, useEffect } from 'react';

/**
 * Theo dõi breakpoint mobile bằng matchMedia (cùng pattern với AppContext).
 * Mặc định khớp với @media (max-width: 768px) trong index.css.
 */
export function useIsMobile(query = '(max-width: 768px)'): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
