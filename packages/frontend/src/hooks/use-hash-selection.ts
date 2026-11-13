import { useCallback, useEffect, useState } from 'react';

const PREFIX = '#request=';
// Request ids are UUIDs. Anything else in the address is ignored.
const ID_PATTERN = /^[0-9a-fA-F-]{8,64}$/;

function readHash(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith(PREFIX)) return null;
  const value = decodeURIComponent(hash.slice(PREFIX.length));
  return ID_PATTERN.test(value) ? value : null;
}

/**
 * The selected request id, kept in the address bar (`#request=<id>`) so a reload
 * keeps the selection and a copied link opens that request.
 */
export function useHashSelection(): [string | null, (id: string | null) => void] {
  const [id, setId] = useState<string | null>(readHash);

  useEffect(() => {
    const onChange = () => setId(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const select = useCallback((next: string | null) => {
    setId(next);
    const url =
      window.location.pathname +
      window.location.search +
      (next ? PREFIX + encodeURIComponent(next) : '');
    window.history.replaceState(null, '', url);
  }, []);

  return [id, select];
}
