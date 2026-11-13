import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CurrentUser } from '@/hooks/use-current-user';
import { WORD_SEEDS } from '@/seed/maritime-freight';
import { StandardsView } from '@/views/StandardsView';

type Row = Record<string, unknown> & { id: string };

const { store } = vi.hoisted(() => ({
  store: {
    StandardWord: [] as Row[],
    StandardTerm: [] as Row[],
    StandardFormula: [] as Row[],
  },
}));

// An in-memory stand-in for the data client, one table per dictionary.
vi.mock('@/lib/rayfin-client', () => {
  let seq = 0;
  type Name = keyof typeof store;
  const entity = (name: Name) => {
    const chain: Record<string, unknown> = {};
    for (const method of ['orderBy', 'first', 'after', 'where']) chain[method] = () => chain;
    chain.executePaginated = async () => ({
      items: store[name].map((row) => ({ ...row })),
      hasNextPage: false,
    });
    return {
      select: () => chain,
      // Return only the id, as a service that sends back few fields would.
      create: async (input: Record<string, unknown>) => {
        const id = `id-${++seq}`;
        store[name].push({ id, ...input });
        return { id };
      },
      update: async ({ id }: { id: string }, patch: Record<string, unknown>) => {
        Object.assign(store[name].find((row) => row.id === id)!, patch);
      },
      delete: async ({ id }: { id: string }) => {
        store[name].splice(store[name].findIndex((row) => row.id === id), 1);
      },
    };
  };
  return {
    getRayfinClient: async () => ({
      data: {
        StandardWord: entity('StandardWord'),
        StandardTerm: entity('StandardTerm'),
        StandardFormula: entity('StandardFormula'),
      },
    }),
  };
});

const staff: CurrentUser = { id: 's1', email: 'yjshin@in4ucloud.com', isStaff: true };
const requester: CurrentUser = { id: 'u1', email: 'someone@example.com', isStaff: false };

const stamp = { updatedAt: new Date(2026, 10, 13), updatedBy: 'yjshin@in4ucloud.com' };
const word = (id: string, w: string, category: string, extra: Record<string, unknown> = {}): Row => ({
  id, word: w, category, formalName: '', description: '', ...stamp, ...extra,
});

describe('StandardsView', () => {
  beforeEach(() => {
    store.StandardWord = [
      word('1', 'DWT', '적재량', { formalName: 'Deadweight Tonnage', description: '재화중량톤수' }),
      word('2', 'TPC', '적재량', { formalName: 'Tons Per Centimeter' }),
      word('3', 'PANAMAX', '선형', { formalName: '파나막스' }),
    ];
    store.StandardTerm = [];
    store.StandardFormula = [];
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists entries grouped by category with a count', async () => {
    render(<StandardsView kind="words" user={requester} />);
    expect(await screen.findByText('Deadweight Tonnage')).toBeVisible();
    expect(screen.getByRole('region', { name: '적재량' })).toBeVisible();
    expect(screen.getByRole('region', { name: '선형' })).toBeVisible();
    expect(screen.getByText(/^3건/)).toBeVisible();
  });

  it('narrows the list as the user searches and says when nothing matches', async () => {
    render(<StandardsView kind="words" user={requester} />);
    await screen.findByText('Deadweight Tonnage');
    const box = screen.getByRole('searchbox', { name: '표준 단어 검색' });

    fireEvent.change(box, { target: { value: '중량' } });
    expect(screen.getByText('DWT')).toBeVisible();
    expect(screen.queryByText('TPC')).toBeNull();
    expect(screen.getByText(/^1건 \/ 전체 3건/)).toBeVisible();

    fireEvent.change(box, { target: { value: 'zzz' } });
    expect(screen.getByText('조건에 맞는 항목이 없습니다')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '검색 초기화' }));
    expect(await screen.findByText('TPC')).toBeVisible();
  });

  it('filters by category', async () => {
    render(<StandardsView kind="words" user={requester} />);
    await screen.findByText('PANAMAX');
    fireEvent.click(within(screen.getByRole('group', { name: '분류 필터' })).getByRole('button', { name: /^선형/ }));
    expect(screen.getByText('PANAMAX')).toBeVisible();
    expect(screen.queryByText('DWT')).toBeNull();
  });

  it('shows a requester the dictionary without any way to change it', async () => {
    render(<StandardsView kind="words" user={requester} />);
    await screen.findByText('DWT');
    expect(screen.queryByRole('button', { name: /등록/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /수정/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /삭제/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /초기 데이터/ })).toBeNull();
  });

  it('lets staff register a word, and keeps what they typed in the list', async () => {
    render(<StandardsView kind="words" user={staff} />);
    await screen.findByText('DWT');
    fireEvent.click(screen.getByRole('button', { name: '표준 단어 등록' }));
    fireEvent.change(screen.getByLabelText(/표준 단어 \(약어\)/), { target: { value: 'Draft Cut' } });
    fireEvent.change(within(screen.getByRole('form', { name: '표준 단어 등록' })).getByLabelText(/^분류/), { target: { value: '적재량' } });
    fireEvent.change(screen.getByLabelText('설명'), { target: { value: '흘수 제한 선택' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => expect(screen.queryByRole('form', { name: '표준 단어 등록' })).toBeNull());
    expect(await screen.findByText('흘수 제한 선택')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Draft Cut 항목을 등록했습니다');
    expect(store.StandardWord.some((r) => r.word === 'Draft Cut' && r.updatedBy === staff.email)).toBe(true);
  });

  it('refuses a name that is already registered, ignoring case', async () => {
    render(<StandardsView kind="words" user={staff} />);
    await screen.findByText('DWT');
    fireEvent.click(screen.getByRole('button', { name: '표준 단어 등록' }));
    fireEvent.change(screen.getByLabelText(/표준 단어 \(약어\)/), { target: { value: 'dwt' } });
    fireEvent.change(within(screen.getByRole('form', { name: '표준 단어 등록' })).getByLabelText(/^분류/), { target: { value: '적재량' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('이미 등록된 표준 단어입니다: dwt');
    expect(store.StandardWord).toHaveLength(3);
  });

  it('asks for the required fields before saving', async () => {
    render(<StandardsView kind="words" user={staff} />);
    await screen.findByText('DWT');
    fireEvent.click(screen.getByRole('button', { name: '표준 단어 등록' }));
    fireEvent.submit(screen.getByRole('form', { name: '표준 단어 등록' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('표준 단어 (약어)을(를) 입력해 주세요');
  });

  it('lets staff edit an entry', async () => {
    render(<StandardsView kind="words" user={staff} />);
    await screen.findByText('TPC');
    fireEvent.click(screen.getByRole('button', { name: 'TPC 수정' }));
    fireEvent.change(screen.getByLabelText('설명'), { target: { value: '흘수 1cm당 화물 중량' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    // Wait for the form to close, so the text found is the list row and not the textarea.
    await waitFor(() => expect(screen.queryByRole('form', { name: '표준 단어 수정' })).toBeNull());
    expect(await screen.findByText('흘수 1cm당 화물 중량')).toBeVisible();
    expect(store.StandardWord.find((r) => r.word === 'TPC')?.description).toBe('흘수 1cm당 화물 중량');
  });

  it('asks before deleting, naming the entry', async () => {
    render(<StandardsView kind="words" user={staff} />);
    await screen.findByText('PANAMAX');
    fireEvent.click(screen.getByRole('button', { name: 'PANAMAX 삭제' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('PANAMAX 표준 단어을(를) 삭제할까요?');
    fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }));
    await waitFor(() => expect(screen.queryByText('PANAMAX')).toBeNull());
    expect(store.StandardWord.some((r) => r.word === 'PANAMAX')).toBe(false);
  });

  it('loads the source document into an empty dictionary on request, once', async () => {
    store.StandardWord = [];
    render(<StandardsView kind="words" user={staff} />);
    expect(await screen.findByText('등록된 표준 단어가 없습니다')).toBeVisible();
    fireEvent.click(screen.getAllByRole('button', { name: '초기 데이터 불러오기' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '불러오기' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(`등록 ${WORD_SEEDS.length}건`)
    );
    expect(store.StandardWord).toHaveLength(WORD_SEEDS.length);
    expect(await screen.findByText('Deadweight Tonnage')).toBeVisible();

    // A second run adds nothing: every name already exists.
    fireEvent.click(screen.getAllByRole('button', { name: '초기 데이터 불러오기' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '불러오기' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('등록 0건'));
    expect(store.StandardWord).toHaveLength(WORD_SEEDS.length);
  });

  it('shows a formula with its expression and lets the user jump to what it uses', async () => {
    store.StandardFormula = [
      { id: 'f1', name: '@TTL hire', title: '용선료 총액', unit: '', category: '[7] 용선료 총액', depth: 1, sortOrder: 20,
        expression: '@H/B × @Duration × (1 − Add Comm)', description: '', dependsOn: '@H/B, @Duration', notes: '', ...stamp },
      { id: 'f2', name: '@H/B', title: '일일 용선료', unit: '', category: '[3] 일일 용선료 (H/B)', depth: 1, sortOrder: 10,
        expression: '', description: '', dependsOn: '', notes: '⚠️ 확인 필요', ...stamp },
    ];
    render(<StandardsView kind="formulas" user={requester} />);
    expect(await screen.findByText('@H/B × @Duration × (1 − Add Comm)')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '@H/B' }));
    expect(screen.getByRole('searchbox', { name: '표준 계산식 검색' })).toHaveValue('@H/B');
    expect(await screen.findByText('⚠️ 확인 필요')).toBeVisible();
  });

  it('shows an actionable error when the dictionary cannot be read', async () => {
    store.StandardWord = undefined as unknown as Row[];
    render(<StandardsView kind="words" user={staff} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('데이터를 불러오지 못했습니다');
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeVisible();
  });
});
