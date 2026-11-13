import { useCallback, useEffect, useRef, useState } from 'react';

import { describeError } from '@/lib/errors';
import { FETCHERS } from '@/lib/dictionary-queries';
import type { DictionaryKind, RowMap } from '@/lib/dictionary';
import type { Drained } from '@/lib/request-queries';

export type DictionaryStatus = 'loading' | 'ready' | 'error';

export interface UseDictionaryResult<R extends { id: string }> {
  rows: readonly R[];
  status: DictionaryStatus;
  error: string | null;
  /** True when more entries exist than were read. */
  truncated: boolean;
  loadedAt: Date | null;
  reload(): void;
  /** Add a new row or replace the row with the same id. */
  upsertLocal(row: R): void;
  removeLocal(id: string): void;
}

/** Every entry of one dictionary. Dictionaries are small, so searching is done in the browser. */
export function useDictionary<K extends DictionaryKind>(kind: K): UseDictionaryResult<RowMap[K]> {
  const [rows, setRows] = useState<readonly RowMap[K][]>([]);
  const [status, setStatus] = useState<DictionaryStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const mine = ++generation.current;
    setStatus('loading');
    setError(null);
    try {
      const fetcher = FETCHERS[kind] as () => Promise<Drained<RowMap[K]>>;
      const result = await fetcher();
      if (mine !== generation.current) return;
      setRows(result.items);
      setTruncated(result.truncated);
      setLoadedAt(new Date());
      setStatus('ready');
    } catch (e) {
      if (mine !== generation.current) return;
      setError(describeError(e, 'load'));
      setStatus('error');
    }
  }, [kind]);

  useEffect(() => {
    // Fetch on mount and whenever the dictionary changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return {
    rows,
    status,
    error,
    truncated,
    loadedAt,
    reload: () => void load(),
    upsertLocal: (row) =>
      setRows((prev) =>
        prev.some((r) => r.id === row.id)
          ? prev.map((r) => (r.id === row.id ? row : r))
          : [...prev, row]
      ),
    removeLocal: (id) => setRows((prev) => prev.filter((r) => r.id !== id)),
  };
}
