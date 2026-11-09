import type { OpaqueSession } from '@microsoft/rayfin-auth';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/App';
import { AuthContext, type AuthContextValue } from '@/hooks/auth.context';

const { executePaginated } = vi.hoisted(() => ({ executePaginated: vi.fn() }));

// A chainable stand-in for `client.data.DataRequest.select(...)...executePaginated()`.
vi.mock('@/lib/rayfin-client', () => {
  const chain: Record<string, unknown> = {};
  for (const method of ['orderBy', 'first', 'where', 'after']) {
    chain[method] = () => chain;
  }
  chain.executePaginated = () => executePaginated();
  return {
    getRayfinClient: async () => ({
      data: { DataRequest: { select: () => chain } },
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
    vi.restoreAllMocks();
    executePaginated.mockReset();
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
    expect(screen.getByText('긴급')).toBeVisible();
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
