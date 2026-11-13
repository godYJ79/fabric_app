import { useEffect, useMemo, useRef, useState } from 'react';
import { Database, Plus, Search } from 'lucide-react';
import type {
  StandardFormulaRecord,
  StandardTermRecord,
  StandardWordRecord,
} from '@rayfin-app/shared';

import { DictionaryForm } from '@/components/dictionary/DictionaryForm';
import {
  blankValues,
  toInput,
  valuesOf,
  type Values,
} from '@/components/dictionary/form-config';
import {
  ColumnHeader,
  FormulaRow,
  TermRow,
  WordRow,
  type RowActions,
} from '@/components/dictionary/Rows';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import type { CurrentUser } from '@/hooks/use-current-user';
import { useDictionary } from '@/hooks/use-dictionary';
import {
  categoriesOf,
  findDuplicate,
  KEY_LABEL,
  KIND_LABEL,
  matchesQuery,
  nameOf,
  searchFields,
  sortRows,
  type DictionaryKind,
  type RowMap,
} from '@/lib/dictionary';
import {
  createEntry,
  deleteEntry,
  seedDictionary,
  updateEntry,
} from '@/lib/dictionary-queries';
import { describeError } from '@/lib/errors';
import { FORMULA_SEEDS, TERM_SEEDS, WORD_SEEDS } from '@/seed/maritime-freight';
import { cn } from '@/lib/utils';

const INTRO: Record<DictionaryKind, string> = {
  words: '업무에서 쓰는 단어와 약어의 표준 이름과 뜻입니다.',
  terms: '표준 단어를 조합해 만든 업무 용어와 그 정의입니다.',
  formulas: '지표(Measure)를 어떻게 계산하는지 정리한 표준 계산식입니다.',
};

const COLUMNS: Partial<Record<DictionaryKind, string>> = {
  words: '표준 단어|정식 명칭|설명|',
  terms: '용어명|영문 약어|정의|',
};

const SEED_COUNT: Record<DictionaryKind, number> = {
  words: WORD_SEEDS.length,
  terms: TERM_SEEDS.length,
  formulas: FORMULA_SEEDS.length,
};

type Entry = RowMap[DictionaryKind];
type FormState = { mode: 'create' } | { mode: 'edit'; row: Entry };

export function StandardsView({
  kind,
  user,
}: {
  readonly kind: DictionaryKind;
  readonly user: CurrentUser;
}) {
  const { rows, status, error, truncated, loadedAt, reload, upsertLocal, removeLocal } =
    useDictionary(kind);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [seedAsk, setSeedAsk] = useState(false);
  const [seedProgress, setSeedProgress] = useState<{ done: number; total: number } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const label = KIND_LABEL[kind];
  const sorted = useMemo(() => sortRows(kind, rows as Entry[]), [kind, rows]);
  const categories = useMemo(() => categoriesOf(sorted), [sorted]);
  const filtered = useMemo(
    () =>
      sorted.filter(
        (row) =>
          (category === null || row.category === category) &&
          matchesQuery(searchFields(kind, row), query)
      ),
    [sorted, category, query, kind]
  );
  const groups = useMemo(
    () =>
      categoriesOf(filtered).map((c) => ({
        name: c.name,
        rows: filtered.filter((row) => row.category === c.name),
      })),
    [filtered]
  );

  useEffect(() => {
    if (form) formRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [form]);

  function actionsFor(row: Entry): RowActions {
    return {
      staff: user.isStaff,
      confirming: deletingId === row.id,
      deleting,
      onEdit: () => {
        setMessage(null);
        setSeedAsk(false);
        setForm({ mode: 'edit', row });
      },
      onAskDelete: () => {
        setMessage(null);
        setDeletingId(row.id);
      },
      onCancelDelete: () => setDeletingId(null),
      onConfirmDelete: () => void remove(row),
    };
  }

  async function remove(row: Entry) {
    if (deleting) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteEntry(kind, row.id);
      removeLocal(row.id);
      setDeletingId(null);
      setMessage(`${nameOf(kind, row)} 항목을 삭제했습니다.`);
    } catch (e) {
      setActionError(describeError(e, 'delete'));
      setDeletingId(null);
    } finally {
      setDeleting(false);
    }
  }

  async function save(values: Values): Promise<string | null> {
    if (!form) return null;
    const editingId = form.mode === 'edit' ? form.row.id : undefined;
    const name = (values[kind === 'words' ? 'word' : 'name'] ?? '').trim();
    const duplicate = findDuplicate(kind, rows as Entry[], name, editingId);
    if (duplicate) return `이미 등록된 ${KEY_LABEL[kind]}입니다: ${name}`;
    const input = toInput(kind, values, user.email);
    try {
      if (form.mode === 'create') {
        upsertLocal(await createEntry(kind, input));
        setMessage(`${name} 항목을 등록했습니다.`);
      } else {
        await updateEntry(kind, form.row.id, input);
        upsertLocal({ ...form.row, ...input } as Entry);
        setMessage(`${name} 항목을 저장했습니다.`);
      }
      setForm(null);
      return null;
    } catch (e) {
      return describeError(e, 'save');
    }
  }

  async function runSeed() {
    setSeedAsk(false);
    setMessage(null);
    setActionError(null);
    setSeedProgress({ done: 0, total: SEED_COUNT[kind] });
    try {
      const result = await seedDictionary(kind, rows as Entry[], user.email, (done, total) =>
        setSeedProgress({ done, total })
      );
      setMessage(
        `초기 데이터를 불러왔습니다. 등록 ${result.created}건` +
          (result.skipped ? `, 이미 있어서 건너뜀 ${result.skipped}건` : '') +
          (result.failed ? `, 실패 ${result.failed}건` : '') +
          '.'
      );
      if (result.failed > 0) {
        setActionError('일부 항목을 등록하지 못했습니다. 잠시 후 다시 불러오면 빠진 것만 등록됩니다.');
      }
      reload();
    } catch (e) {
      setActionError(describeError(e, 'save'));
    } finally {
      setSeedProgress(null);
    }
  }

  function openCreate() {
    setMessage(null);
    setSeedAsk(false);
    setForm({ mode: 'create' });
  }

  const seedButton = user.isStaff ? (
    <button
      type="button"
      onClick={() => {
        setForm(null);
        setSeedAsk(true);
      }}
      disabled={seedProgress !== null}
      className="inline-flex items-center gap-200 rounded-lg border border-border bg-card px-300 py-200 text-300 font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
    >
      <Database aria-hidden="true" className="icon-size-200" />
      초기 데이터 불러오기
    </button>
  ) : null;

  const createButton = user.isStaff ? (
    <button
      type="button"
      onClick={openCreate}
      className="inline-flex items-center gap-200 rounded-lg bg-primary px-400 py-200 text-300 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Plus aria-hidden="true" className="icon-size-200" />
      {label} 등록
    </button>
  ) : null;

  return (
    <div className="space-y-400">
      <header className="flex flex-wrap items-start justify-between gap-300">
        <div>
          <h2 className="text-600 font-semibold text-foreground">{label}</h2>
          <p className="mt-100 text-300 text-muted-foreground">{INTRO[kind]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-200">
          {seedButton}
          {createButton}
        </div>
      </header>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="icon-size-200 pointer-events-none absolute left-300 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={searchRef}
          type="search"
          aria-label={`${label} 검색`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={kind === 'formulas' ? '이름, 계산식, 설명으로 검색' : '이름, 설명, 분류로 검색'}
          className="block w-full rounded-lg border border-input bg-card py-200 pl-800 pr-300 text-300 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {categories.length > 1 ? (
        <div role="group" aria-label="분류 필터" className="flex flex-wrap gap-200">
          {[{ name: null as string | null, count: rows.length }, ...categories].map((c) => (
            <button
              key={c.name ?? 'all'}
              type="button"
              aria-pressed={category === c.name}
              onClick={() => setCategory(c.name)}
              className={cn(
                'rounded-full border px-300 py-100 text-[length:var(--text-300)] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                category === c.name
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:bg-accent'
              )}
            >
              {c.name ?? '전체'}
              <span className="ml-100 font-monospace text-200 opacity-80">{c.count}</span>
            </button>
          ))}
        </div>
      ) : null}

      {status === 'ready' ? (
        <p className="text-200 text-muted-foreground">
          {filtered.length.toLocaleString('ko-KR')}건
          {filtered.length !== rows.length ? ` / 전체 ${rows.length.toLocaleString('ko-KR')}건` : ''}
          {loadedAt ? ` · ${loadedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준` : ''}
          {truncated ? ' · 일부만 표시됨' : ''}
        </p>
      ) : null}

      {message ? (
        <p role="status" className="rounded-lg bg-accent px-300 py-200 text-300 text-accent-foreground">
          {message}
        </p>
      ) : null}
      {actionError ? <ErrorState message={actionError} /> : null}

      {seedAsk ? (
        <div
          role="alertdialog"
          aria-label="초기 데이터 불러오기 확인"
          className="space-y-300 rounded-xl border border-border bg-card p-400"
        >
          <p className="text-300 text-foreground">
            「해상운임 계산 로직 정리」 문서의 {label} <strong>{SEED_COUNT[kind]}건</strong>을
            등록합니다. 이미 같은 이름이 있으면 건너뛰므로 여러 번 실행해도 중복되지 않습니다.
          </p>
          <div className="flex justify-end gap-200">
            <button
              type="button"
              onClick={() => setSeedAsk(false)}
              className="rounded-lg px-300 py-100 text-300 font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void runSeed()}
              className="rounded-lg bg-primary px-300 py-100 text-300 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              불러오기
            </button>
          </div>
        </div>
      ) : null}

      {seedProgress ? (
        <p role="status" className="text-300 text-muted-foreground">
          초기 데이터를 등록하는 중… {seedProgress.done}/{seedProgress.total}
        </p>
      ) : null}

      {form ? (
        <div ref={formRef}>
          <DictionaryForm
            key={form.mode === 'edit' ? form.row.id : 'new'}
            kind={kind}
            mode={form.mode}
            initial={form.mode === 'edit' ? valuesOf(kind, form.row) : blankValues(kind, rows as Entry[])}
            categories={categories.map((c) => c.name)}
            onSubmit={save}
            onCancel={() => setForm(null)}
          />
        </div>
      ) : null}

      {status === 'loading' ? <LoadingState rows={5} /> : null}
      {status === 'error' && error ? <ErrorState message={error} onRetry={reload} /> : null}

      {status === 'ready' && rows.length === 0 ? (
        <EmptyState
          title={`등록된 ${label}가 없습니다`}
          hint={
            user.isStaff
              ? '직접 등록하거나, 문서의 초기 데이터를 불러올 수 있습니다.'
              : '담당자가 등록하면 여기에 표시됩니다.'
          }
          action={
            user.isStaff ? (
              <div className="flex flex-wrap justify-center gap-200">
                {createButton}
                {seedButton}
              </div>
            ) : undefined
          }
        />
      ) : null}

      {status === 'ready' && rows.length > 0 && filtered.length === 0 ? (
        <EmptyState
          title="조건에 맞는 항목이 없습니다"
          hint="검색어를 줄이거나 분류를 바꿔 보세요."
          action={
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory(null);
              }}
              className="rounded-lg border border-border bg-card px-400 py-200 text-300 font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              검색 초기화
            </button>
          }
        />
      ) : null}

      {status === 'ready' && groups.length > 0 ? (
        <div className="space-y-500">
          {COLUMNS[kind] ? <ColumnHeader columns={COLUMNS[kind]!} /> : null}
          {groups.map((group) => (
            <section key={group.name} aria-label={group.name}>
              <h3 className="mb-200 flex items-baseline gap-200 text-400 font-semibold text-foreground">
                {group.name}
                <span className="font-monospace text-200 font-normal text-muted-foreground">
                  {group.rows.length}
                </span>
              </h3>
              <ul className="space-y-200">
                {group.rows.map((row) =>
                  kind === 'words' ? (
                    <WordRow key={row.id} row={row as StandardWordRecord} actions={actionsFor(row)} />
                  ) : kind === 'terms' ? (
                    <TermRow key={row.id} row={row as StandardTermRecord} actions={actionsFor(row)} />
                  ) : (
                    <FormulaRow
                      key={row.id}
                      row={row as StandardFormulaRecord}
                      actions={actionsFor(row)}
                      onSearch={(name) => {
                        setCategory(null);
                        setQuery(name);
                        searchRef.current?.focus();
                      }}
                    />
                  )
                )}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
