import type { PagedResult } from '@microsoft/rayfin-data';

import type { ExportRow } from '@/lib/export-requests';
import { isEmptyWhere, type RequestWhere } from '@/lib/query';
import { getRayfinClient } from '@/lib/rayfin-client';

export type RequestListRow = {
  id: string;
  title: string;
  status: 'received' | 'analyzing' | 'done';
  urgency: 'low' | 'normal' | 'urgent';
  targetTable: string;
  requesterEmail: string;
  createdAt: Date;
};

export type StatusRow = Pick<RequestListRow, 'id' | 'status' | 'urgency'>;

/** Rows fetched per request when reading everything. */
const DRAIN_PAGE_SIZE = 500;

/** One page of the request list. Row access is enforced by the data service. */
export async function fetchRequestPage(
  where: RequestWhere,
  cursor: string | null,
  size: number
): Promise<PagedResult<RequestListRow>> {
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
    .first(size);
  if (!isEmptyWhere(where)) query = query.where(where);
  if (cursor) query = query.after(cursor);
  return (await query.executePaginated()) as PagedResult<RequestListRow>;
}

async function fetchStatusPage(cursor: string | null): Promise<PagedResult<StatusRow>> {
  const client = await getRayfinClient();
  let query = client.data.DataRequest.select(['id', 'status', 'urgency'])
    .orderBy({ id: 'asc' })
    .first(DRAIN_PAGE_SIZE);
  if (cursor) query = query.after(cursor);
  return (await query.executePaginated()) as PagedResult<StatusRow>;
}

async function fetchExportPage(
  where: RequestWhere,
  cursor: string | null
): Promise<PagedResult<ExportRow>> {
  const client = await getRayfinClient();
  let query = client.data.DataRequest.select([
    'id',
    'title',
    'targetTable',
    'urgency',
    'status',
    'requesterEmail',
    'createdAt',
    'symptom',
  ])
    .orderBy({ createdAt: 'desc' })
    .orderBy({ id: 'asc' })
    .first(DRAIN_PAGE_SIZE);
  if (!isEmptyWhere(where)) query = query.where(where);
  if (cursor) query = query.after(cursor);
  return (await query.executePaginated()) as PagedResult<ExportRow>;
}

export interface Drained<T> {
  items: T[];
  /** True when more rows existed than the cap allowed. */
  truncated: boolean;
}

/** Reads pages until the end or the cap. The sort order must be stable across pages. */
export async function drain<T>(
  page: (cursor: string | null) => Promise<PagedResult<T>>,
  cap: number
): Promise<Drained<T>> {
  const items: T[] = [];
  let cursor: string | null = null;
  for (;;) {
    const result = await page(cursor);
    items.push(...result.items);
    if (!result.hasNextPage) return { items, truncated: false };
    if (items.length >= cap) return { items: items.slice(0, cap), truncated: true };
    if (!result.endCursor) return { items, truncated: false };
    cursor = result.endCursor;
  }
}

/** Status and urgency of every request the signed-in user may read, for the summary. */
export function fetchStatusRows(cap: number): Promise<Drained<StatusRow>> {
  return drain(fetchStatusPage, cap);
}

export function fetchExportRows(where: RequestWhere, cap: number): Promise<Drained<ExportRow>> {
  return drain((cursor) => fetchExportPage(where, cursor), cap);
}
