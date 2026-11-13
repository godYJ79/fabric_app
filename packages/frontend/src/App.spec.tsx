import type { OpaqueSession } from '@microsoft/rayfin-auth';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/App';
import { AuthContext, type AuthContextValue } from '@/hooks/auth.context';

const { executePaginated, whereSpy } = vi.hoisted(() => ({
  executePaginated: vi.fn(),
  whereSpy: vi.fn(),
}));

// A chainable stand-in for `client.data.DataRequest.select(...)...executePaginated()`.
vi.mock('@/lib/rayfin-client', () => {
  const chain: Record<string, unknown> = {};
  for (const method of ['orderBy', 'first', 'after']) {
    chain[method] = () => chain;
  }
  chain.where = (filter: unknown) => {
    whereSpy(filter);
    return chain;
  };
  chain.executePaginated = () => executePaginated();
  return {
    getRayfinClient: async () => ({
      data: {
        DataRequest: { select: () => chain },
        StandardWord: { select: () => chain },
        StandardTerm: { select: () => chain },
        StandardFormula: { select: () => chain },
      },
    }),
  };
});

function session(email: string | null): OpaqueSession {
  return {
    user: email ? { id: 'user-1', email } : null,
    isAuthenticated: true,
    isAnonymous: false,
  };
}

function renderApp(email: string | null) {
  const value: AuthContextValue = {
    session: session(email),
    isAuthenticated: true,
    isLoading: false,
    canSignIn: true,
    signIn: async () => {},
    isSigningIn: false,
    signInError: null,
    config: { kind: 'ready' },
    error: null,
  };
  return render(
    <AuthContext.Provider value={value}>
      <App />
    </AuthContext.Provider>
  );
}

describe('App', () => {
  beforeEach(() => {
    executePaginated.mockResolvedValue({
      items: [],
      hasNextPage: false,
      endCursor: null,
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
    executePaginated.mockReset();
    whereSpy.mockReset();
  });

  it('opens the dictionaries from the left menu and returns to the requests', async () => {
    renderApp('someone@example.com');
    await screen.findByText('아직 등록한 요청이 없습니다');
    expect(screen.getByRole('heading', { level: 2, name: '데이터 요청' })).toBeVisible();

    const nav = screen.getByRole('navigation', { name: '주 메뉴' });
    fireEvent.click(within(nav).getByRole('button', { name: '표준 용어 메뉴' }));
    expect(await screen.findByRole('heading', { level: 2, name: '표준 단어' })).toBeVisible();
    expect(within(nav).getByRole('button', { name: '표준 계산식' })).toBeVisible();

    fireEvent.click(within(nav).getByRole('button', { name: '표준 계산식' }));
    expect(await screen.findByRole('heading', { level: 2, name: '표준 계산식' })).toBeVisible();
    expect(window.location.hash).toBe('#standards=formulas');

    fireEvent.click(within(nav).getByRole('button', { name: '데이터 요청' }));
    expect(await screen.findByRole('heading', { level: 2, name: '데이터 요청' })).toBeVisible();
    expect(window.location.hash).toBe('');
  });

  it('opens a dictionary straight from its link', async () => {
    window.location.hash = '#standards=terms';
    renderApp('someone@example.com');
    expect(await screen.findByRole('heading', { level: 2, name: '표준 용어' })).toBeVisible();
    const nav = screen.getByRole('navigation', { name: '주 메뉴' });
    expect(within(nav).getByRole('button', { name: '표준 단어' })).toBeVisible();
  });

  it('explains when the session has no user instead of loading data', () => {
    renderApp(null);
    expect(screen.getByText('사용자 정보를 확인할 수 없습니다')).toBeVisible();
    expect(executePaginated).not.toHaveBeenCalled();
  });

  it('shows a requester an empty list and the requester badge', async () => {
    renderApp('someone@example.com');
    expect(screen.getByText('요청자')).toBeVisible();
    expect(await screen.findByText('아직 등록한 요청이 없습니다')).toBeVisible();
  });

  it('labels the configured staff address as staff', async () => {
    renderApp('yjshin@in4ucloud.com');
    expect(screen.getByText('담당자')).toBeVisible();
    expect(await screen.findByText('접수된 요청이 없습니다')).toBeVisible();
  });

  it('renders loaded requests with a readable status and ticket number', async () => {
    executePaginated.mockResolvedValue({
      items: [
        {
          id: 'abcdef12-0000-0000-0000-000000000000',
          title: '매출 합계 불일치',
          status: 'analyzing',
          urgency: 'urgent',
          targetTable: 'Sales_Daily',
          requesterEmail: 'someone@example.com',
          createdAt: new Date('2026-11-09T01:00:00Z'),
        },
      ],
      hasNextPage: false,
      endCursor: null,
    });
    renderApp('someone@example.com');
    expect(await screen.findByText('매출 합계 불일치')).toBeVisible();
    expect(screen.getByText('#ABCDEF')).toBeVisible();
    // The status filter button and the row badge both say "분석 중".
    expect(screen.getAllByText('분석 중').length).toBeGreaterThanOrEqual(2);
    // The urgency tag on the row; the filter list has an option with the same word.
    expect(screen.getAllByText('긴급').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('긴급 미처리')).toBeVisible();
  });

  it('shows the counts of the requests it can read in the summary cards', async () => {
    executePaginated.mockResolvedValue({
      items: [
        { id: '1', title: 'a', status: 'received', urgency: 'urgent', targetTable: 't', requesterEmail: 'x@y.z', createdAt: new Date() },
        { id: '2', title: 'b', status: 'done', urgency: 'low', targetTable: 't', requesterEmail: 'x@y.z', createdAt: new Date() },
      ],
      hasNextPage: false,
      endCursor: null,
    });
    renderApp('someone@example.com');
    const total = await screen.findByRole('button', { name: /^전체\s*2$/ });
    expect(total).toBeVisible();
    expect(screen.getByRole('button', { name: /^긴급 미처리\s*1$/ })).toBeVisible();
  });

  it('turns the search box into a server-side filter after the user pauses', async () => {
    renderApp('someone@example.com');
    await screen.findByText('아직 등록한 요청이 없습니다');
    fireEvent.change(screen.getByRole('searchbox', { name: '요청 검색' }), {
      target: { value: '매출' },
    });
    await waitFor(
      () => {
        expect(whereSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            or: [
              { title: { contains: '매출' } },
              { targetTable: { contains: '매출' } },
              { requesterEmail: { contains: '매출' } },
            ],
          })
        );
      },
      { timeout: 2000 }
    );
    expect(await screen.findByText('조건에 맞는 요청이 없습니다')).toBeVisible();
  });

  it('filters by status when a summary card is chosen', async () => {
    renderApp('someone@example.com');
    await screen.findByText('아직 등록한 요청이 없습니다');
    fireEvent.click(screen.getByRole('button', { name: /^접수/ }));
    await waitFor(() => {
      expect(whereSpy).toHaveBeenCalledWith({ status: { eq: 'received' } });
    });
  });

  it('shows an actionable error, not provider details, when loading fails', async () => {
    executePaginated.mockRejectedValue(new Error('GraphQL internal detail 0xDEADBEEF'));
    renderApp('someone@example.com');
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('데이터를 불러오지 못했습니다');
    });
    expect(screen.queryByText(/0xDEADBEEF/)).toBeNull();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeVisible();
  });
});
