import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataRequestRecord, RequestStatus } from '@rayfin-app/shared';

import { describeError } from '@/lib/errors';
import { getRayfinClient } from '@/lib/rayfin-client';

export type StatusFilter = RequestStatus | 'all';

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

async function fetchPage(filter: StatusFilter, cursor: string | null) {
  const client = await getRayfinClient();
  let query = client.data.DataRequest.select([
    'id',
    'title',
    'status',
    'urgency',
    'targetTable',
    'requesterEmail',
    'createdAt',
  ])
    .orderBy({ createdAt: 'desc' })
    .orderBy({ id: 'asc' })
    .first(PAGE_SIZE);
  if (filter !== 'all') query = query.where({ status: { eq: filter } });
  if (cursor) query = query.after(cursor);
  return query.executePaginated();
}

export type ListStatus = 'loading' | 'ready' | 'error';

export interface UseRequestsResult {
  items: readonly RequestSummary[];
  status: ListStatus;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  reload(): void;
  loadMore(): void;
  /** Put a just-created request at the top without refetching. */
  addLocal(item: RequestSummary): void;
  patchLocal(id: string, patch: Partial<RequestSummary>): void;
  removeLocal(id: string): void;
}

/**
 * The request list for one status filter, fetched a page at a time.
 * Row-level access is enforced by the data service; this only asks for rows.
 */
export function useRequests(filter: StatusFilter): UseRequestsResult {
  const [items, setItems] = useState<readonly RequestSummary[]>([]);
  const [status, setStatus] = useState<ListStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  // A late response for a previous filter must not overwrite the current one.
  const generation = useRef(0);

  const load = useCallback(async () => {
    const mine = ++generation.current;
    setStatus('loading');
    setError(null);
    setLoadMoreError(null);
    try {
      const page = await fetchPage(filter, null);
      if (mine !== generation.current) return;
      setItems(page.items as RequestSummary[]);
      setCursor(page.hasNextPage ? (page.endCursor ?? null) : null);
      setStatus('ready');
    } catch (e) {
      if (mine !== generation.current) return;
      setError(describeError(e, 'load'));
      setStatus('error');
    }
  }, [filter]);

  useEffect(() => {
    // Fetch on mount and whenever the filter changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    const mine = generation.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await fetchPage(filter, cursor);
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
  }, [cursor, filter, loadingMore]);

  return {
    items,
    status,
    error,
    hasMore: cursor !== null,
    loadingMore,
    loadMoreError,
    reload: () => void load(),
    loadMore: () => void loadMore(),
    addLocal: (item) =>
      setItems((prev) => [item, ...prev.filter((i) => i.id !== item.id)]),
    patchLocal: (id, patch) =>
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    removeLocal: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
  };
}
