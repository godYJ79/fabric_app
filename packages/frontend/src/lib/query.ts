import type { FilterInput } from '@microsoft/rayfin-data';
import type {
  DataRequestRecord,
  RequestStatus,
  RequestUrgency,
} from '@rayfin-app/shared';

/** `open` means not finished yet (received or analyzing). */
export type StatusFilter = RequestStatus | 'open' | 'all';
export type UrgencyFilter = RequestUrgency | 'all';
export type PeriodFilter = 'all' | 'today' | '7d' | '30d' | 'month';

export interface RequestFilters {
  status: StatusFilter;
  urgency: UrgencyFilter;
  period: PeriodFilter;
  /** Matches title, target table or requester e-mail. */
  search: string;
  /** Only requests the signed-in user raised (staff otherwise see everyone's). */
  mineOnly: boolean;
}

export const DEFAULT_FILTERS: RequestFilters = {
  status: 'all',
  urgency: 'all',
  period: 'all',
  search: '',
  mineOnly: false,
};

export const PERIOD_LABEL: Record<PeriodFilter, string> = {
  all: '전체 기간',
  today: '오늘',
  '7d': '최근 7일',
  '30d': '최근 30일',
  month: '이번 달',
};

const SEARCH_MAX = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The first moment a period includes, in the browser's time zone; null for "all". */
export function periodStart(period: PeriodFilter, now: Date = new Date()): Date | null {
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case '7d':
      return new Date(now.getTime() - 7 * DAY_MS);
    case '30d':
      return new Date(now.getTime() - 30 * DAY_MS);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    default:
      return null;
  }
}

export function hasActiveFilters(filters: RequestFilters): boolean {
  return (
    filters.status !== 'all' ||
    filters.urgency !== 'all' ||
    filters.period !== 'all' ||
    filters.mineOnly ||
    filters.search.trim().length > 0
  );
}

/** Does a row's status satisfy the status filter? Used to hide rows edited out of view. */
export function matchesStatus(filter: StatusFilter, status: unknown): boolean {
  if (filter === 'all') return true;
  if (filter === 'open') return status !== 'done';
  return status === filter;
}

export type RequestWhere = FilterInput<DataRequestRecord>;

/**
 * The data-service filter for a set of UI filters. Keys are ANDed together.
 * Access control is not done here: the service applies its row policies as well.
 */
export function buildWhere(
  filters: RequestFilters,
  userId: string,
  now: Date = new Date()
): RequestWhere {
  const where: RequestWhere = {};

  if (filters.status === 'open') where.status = { neq: 'done' };
  else if (filters.status !== 'all') where.status = { eq: filters.status };

  if (filters.urgency !== 'all') where.urgency = { eq: filters.urgency };

  const from = periodStart(filters.period, now);
  if (from) where.createdAt = { gte: from };

  if (filters.mineOnly) where.user_id = { eq: userId };

  const term = filters.search.trim().slice(0, SEARCH_MAX);
  if (term) {
    where.or = [
      { title: { contains: term } },
      { targetTable: { contains: term } },
      { requesterEmail: { contains: term } },
    ];
  }

  return where;
}

export function isEmptyWhere(where: RequestWhere): boolean {
  return Object.keys(where).length === 0;
}
