import { describe, expect, it } from 'vitest';

import {
  buildWhere,
  DEFAULT_FILTERS,
  hasActiveFilters,
  isEmptyWhere,
  matchesStatus,
  periodStart,
  type RequestFilters,
} from './query';

const NOW = new Date(2026, 10, 13, 15, 30); // 2026-11-13 15:30 local
const filters = (patch: Partial<RequestFilters>): RequestFilters => ({
  ...DEFAULT_FILTERS,
  ...patch,
});

describe('buildWhere', () => {
  it('asks for everything by default', () => {
    expect(isEmptyWhere(buildWhere(DEFAULT_FILTERS, 'u1', NOW))).toBe(true);
  });

  it('maps status, urgency and ownership to equality filters', () => {
    expect(
      buildWhere(filters({ status: 'analyzing', urgency: 'urgent', mineOnly: true }), 'u1', NOW)
    ).toEqual({
      status: { eq: 'analyzing' },
      urgency: { eq: 'urgent' },
      user_id: { eq: 'u1' },
    });
  });

  it('treats "open" as anything but done', () => {
    expect(buildWhere(filters({ status: 'open' }), 'u1', NOW)).toEqual({
      status: { neq: 'done' },
    });
  });

  it('searches title, target table and requester, trimmed and bounded', () => {
    const where = buildWhere(filters({ search: `  ${'x'.repeat(150)}  ` }), 'u1', NOW);
    const term = 'x'.repeat(100);
    expect(where.or).toEqual([
      { title: { contains: term } },
      { targetTable: { contains: term } },
      { requesterEmail: { contains: term } },
    ]);
    expect(buildWhere(filters({ search: '   ' }), 'u1', NOW).or).toBeUndefined();
  });

  it('turns a period into a lower bound on creation time', () => {
    const where = buildWhere(filters({ period: 'month' }), 'u1', NOW);
    expect(where.createdAt).toEqual({ gte: new Date(2026, 10, 1) });
  });
});

describe('periodStart', () => {
  it('computes each preset in the local time zone', () => {
    expect(periodStart('all', NOW)).toBeNull();
    expect(periodStart('today', NOW)).toEqual(new Date(2026, 10, 13));
    expect(periodStart('month', NOW)).toEqual(new Date(2026, 10, 1));
    expect(NOW.getTime() - periodStart('7d', NOW)!.getTime()).toBe(7 * 86_400_000);
    expect(NOW.getTime() - periodStart('30d', NOW)!.getTime()).toBe(30 * 86_400_000);
  });
});

describe('status helpers', () => {
  it('matchesStatus hides rows edited out of the active filter', () => {
    expect(matchesStatus('all', 'done')).toBe(true);
    expect(matchesStatus('received', 'received')).toBe(true);
    expect(matchesStatus('received', 'analyzing')).toBe(false);
    expect(matchesStatus('open', 'analyzing')).toBe(true);
    expect(matchesStatus('open', 'done')).toBe(false);
  });

  it('hasActiveFilters ignores blank search but sees every other filter', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters(filters({ search: '  ' }))).toBe(false);
    expect(hasActiveFilters(filters({ search: 'a' }))).toBe(true);
    expect(hasActiveFilters(filters({ period: '7d' }))).toBe(true);
    expect(hasActiveFilters(filters({ mineOnly: true }))).toBe(true);
  });
});
