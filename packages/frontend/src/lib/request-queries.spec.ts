import type { PagedResult } from '@microsoft/rayfin-data';
import { describe, expect, it, vi } from 'vitest';

import { drain } from './request-queries';

function pager(pages: number[][]) {
  return vi.fn(async (cursor: string | null): Promise<PagedResult<number>> => {
    const index = cursor === null ? 0 : Number(cursor);
    return {
      items: pages[index],
      hasNextPage: index < pages.length - 1,
      endCursor: String(index + 1),
    };
  });
}

describe('drain', () => {
  it('reads every page when under the cap', async () => {
    const page = pager([[1, 2], [3, 4], [5]]);
    const result = await drain(page, 100);
    expect(result).toEqual({ items: [1, 2, 3, 4, 5], truncated: false });
    expect(page.mock.calls.map((c) => c[0])).toEqual([null, '1', '2']);
  });

  it('stops at the cap and says it was truncated', async () => {
    const result = await drain(pager([[1, 2], [3, 4], [5, 6]]), 3);
    expect(result).toEqual({ items: [1, 2, 3], truncated: true });
  });

  it('does not loop when the service gives no cursor', async () => {
    const page = vi.fn(async (): Promise<PagedResult<number>> => ({
      items: [1],
      hasNextPage: true,
    }));
    expect(await drain(page, 10)).toEqual({ items: [1], truncated: false });
    expect(page).toHaveBeenCalledTimes(1);
  });
});
