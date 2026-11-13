import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataRequestRecord } from '@rayfin-app/shared';

import { describeError } from '@/lib/errors';
import { buildWhere, type RequestFilters } from '@/lib/query';
import { fetchRequestPage } from '@/lib/request-queries';

export type RequestSummary = Pick<
  DataRequestRecord,
  | 'id'
  | 'title'
  | 'status'
  | 'urgency'
  | 'targetTable'
  | 'requesterEmail'
  | 'createdAt'
>;

const PAGE_SIZE = 25;

export type ListStatus = 'loading' | 'ready' | 'error';

export interface UseRequestsResult {
  items: readonly RequestSummary[];
  status: ListStatus;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  /** When the list was last fetched successfully. */
  loadedAt: Date | null;
  reload(): void;
  loadMore(): void;
  /** Put a just-created request at the top without refetching. */
  addLocal(item: RequestSummary): void;
  patchLocal(id: string, patch: Partial<RequestSummary>): void;
  removeLocal(id: string): void;
}

/**
 * The request list for a set of filters, fetched a page at a time.
 * Row-level access is enforced by the data service; this only asks for rows.
 * Pass a new `filters` object only when a filter actually changes.
 */
export function useRequests(filters: RequestFilters, userId: string): UseRequestsResult {
  const where = useMemo(() => buildWhere(filters, userId), [filters, userId]);
  const [items, setItems] = useState<readonly RequestSummary[]>([]);
  const [status, setStatus] = useState<ListStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  // A late response for previous filters must not overwrite the current list.
  const generation = useRef(0);

  const load = useCallback(async () => {
    const mine = ++generation.current;
    setStatus('loading');
    setError(null);
    setLoadMoreError(null);
    try {
      const page = await fetchRequestPage(where, null, PAGE_SIZE);
      if (mine !== generation.current) return;
      setItems(page.items as RequestSummary[]);
      setCursor(page.hasNextPage ? (page.endCursor ?? null) : null);
      setLoadedAt(new Date());
      setStatus('ready');
    } catch (e) {
      if (mine !== generation.current) return;
      setError(describeError(e, 'load'));
      setStatus('error');
    }
  }, [where]);

  useEffect(() => {
    // Fetch on mount and whenever the filters change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    const mine = generation.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await fetchRequestPage(where, cursor, PAGE_SIZE);
      if (mine !== generation.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [
          ...prev,
          ...(page.items as RequestSummary[]).filter((i) => !seen.has(i.id)),
        ];
      });
      setCursor(page.hasNextPage ? (page.endCursor ?? null) : null);
    } catch (e) {
      if (mine !== generation.current) return;
      setLoadMoreError(describeError(e, 'load'));
    } finally {
      if (mine === generation.current) setLoadingMore(false);
    }
  }, [cursor, where, loadingMore]);

  return {
    items,
    status,
    error,
    hasMore: cursor !== null,
    loadingMore,
    loadMoreError,
    loadedAt,
    reload: () => void load(),
    loadMore: () => void loadMore(),
    addLocal: (item) =>
      setItems((prev) => [item, ...prev.filter((i) => i.id !== item.id)]),
    patchLocal: (id, patch) =>
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    removeLocal: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
  };
}
