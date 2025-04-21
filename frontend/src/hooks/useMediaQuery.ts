import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    // Initial check
    setMatches(media.matches);

    // Update matches when the media query changes
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    media.addEventListener('change', listener);

    // Cleanup listener on unmount
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}

// Common media queries
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsSmallMobile = () => useMediaQuery('(max-width: 480px)');

export default useMediaQuery;
