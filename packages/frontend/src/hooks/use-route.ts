import { useCallback, useEffect, useState } from 'react';

import { parseHash, routeToHash, type Route } from '@/lib/route';

/**
 * The current screen and open request, kept in the address bar so a reload keeps
 * the place and a copied link opens it. Switching screens adds a history entry
 * (the browser's Back button works); opening a request does not.
 */
export function useRoute(): [Route, (next: Route, mode?: 'push' | 'replace') => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);

  const go = useCallback((next: Route, mode: 'push' | 'replace' = 'push') => {
    setRoute(next);
    const url = window.location.pathname + window.location.search + routeToHash(next);
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }, []);

  return [route, go];
}
