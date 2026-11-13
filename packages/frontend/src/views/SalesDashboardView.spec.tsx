import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SalesDashboardView } from '@/views/SalesDashboardView';

const queries: string[] = [];

// A stand-in for the semantic model: answers by reading the DAX it is given.
vi.mock('@/hooks/use-semantic-model-query', () => ({
  useSemanticModelQuery: ({ query }: { query: string }) => {
    queries.push(query);
    if (query.includes('FAIL')) return { data: undefined, isLoading: false, error: undefined, refetch: async () => {} };
    const filtered = query.includes('TREATAS');
    const rows = query.includes('SUMMARIZECOLUMNS')
      ? query.includes("'D_Corporation'[법인]")
        ? [['법인A', 100, 80, 1.25], ['법인B', 50, 100, 0.5]]
        : [['계열1', 70, 70, 1]]
      : [filtered ? [100, 80, 1.25] : [150, 180, 0.8333]];
    return {
      data: { status: 'success', requestId: '', table: { columns: [], rows } },
      isLoading: false,
      error: undefined,
      refetch: async () => {},
    };
  },
}));

describe('SalesDashboardView', () => {
  beforeEach(() => {
    queries.length = 0;
  });

  it('shows 실적, 계획, 차이 and 달성률 for the whole model at first', async () => {
    render(<SalesDashboardView />);
    const kpis = await screen.findByRole('region', { name: '핵심 지표' });
    expect(within(kpis).getByText('150')).toBeVisible();
    expect(within(kpis).getByText('180')).toBeVisible();
    expect(within(kpis).getByText('-30')).toBeVisible();
    expect(within(kpis).getByText('83.3%')).toBeVisible();
    expect(screen.getByText('선택한 조건 없음 (전체)')).toBeVisible();
  });

  it('lists every member of a dimension with its own rate', async () => {
    render(<SalesDashboardView />);
    const card = await screen.findByRole('region', { name: '법인별 실적과 계획' });
    expect(within(card).getByText('법인A')).toBeVisible();
    expect(within(card).getByText('125.0%')).toBeVisible();
    expect(within(card).getByText('50.0%')).toBeVisible();
  });

  it('filters the totals and the other charts when a bar is picked, and clears again', async () => {
    render(<SalesDashboardView />);
    const card = await screen.findByRole('region', { name: '법인별 실적과 계획' });
    fireEvent.click(within(card).getByRole('button', { name: /법인A/ }));

    // The chip names the pick, and the totals now come from a filtered query.
    const chip = await screen.findByRole('button', { name: '법인 법인A 선택 해제' });
    expect(chip).toBeVisible();
    await waitFor(() => {
      expect(queries.some((q) => q.includes('CALCULATETABLE') && q.includes(`TREATAS({"법인A"}, 'D_Corporation'[법인])`))).toBe(true);
      // another dimension's chart is filtered by it ...
      expect(queries.some((q) => q.includes(`'D_Affiliate'[계열사],`) && q.includes(`TREATAS({"법인A"}`))).toBe(true);
    });
    // ... but the picked chart still shows all of its members, the others faded.
    expect(within(card).getByRole('button', { name: /법인A/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(card).getByRole('button', { name: /법인B/ })).toHaveAttribute('aria-pressed', 'false');
    const ownQueries = queries.filter((q) => q.includes(`'D_Corporation'[법인],`));
    expect(ownQueries.at(-1)).not.toContain('TREATAS({"법인A"}');

    fireEvent.click(screen.getByRole('button', { name: '모두 해제' }));
    expect(await screen.findByText('선택한 조건 없음 (전체)')).toBeVisible();
  });

  it('adds a second member with Ctrl-click and removes one from its chip', async () => {
    render(<SalesDashboardView />);
    const card = await screen.findByRole('region', { name: '법인별 실적과 계획' });
    fireEvent.click(within(card).getByRole('button', { name: /법인A/ }));
    fireEvent.click(within(card).getByRole('button', { name: /법인B/ }), { ctrlKey: true });
    expect(await screen.findByRole('button', { name: '법인 법인B 선택 해제' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '법인 법인A 선택 해제' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '법인 법인A 선택 해제' })).toBeNull());
    expect(screen.getByRole('button', { name: '법인 법인B 선택 해제' })).toBeVisible();
  });

  it('switches the detail table to another dimension', async () => {
    render(<SalesDashboardView />);
    const detail = await screen.findByRole('region', { name: '상세 표' });
    fireEvent.click(within(detail).getByRole('button', { name: '법인' }));
    expect(await within(detail).findByRole('columnheader', { name: /법인/ })).toBeVisible();
    expect(within(detail).getByRole('rowheader', { name: '법인A' })).toBeVisible();
  });
});
