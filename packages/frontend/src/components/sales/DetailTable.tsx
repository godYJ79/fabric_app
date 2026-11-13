import { useState } from 'react';

import { QueryError } from '@/components/sales/QueryError';
import { useModelRows } from '@/hooks/use-model-rows';
import {
  buildMembersQuery,
  DIMENSIONS,
  formatAmount,
  formatRate,
  gap,
  rateTone,
  readMembers,
  type MemberRow,
  type RateTone,
  type Selection,
} from '@/lib/sales-model';
import { cn } from '@/lib/utils';

const TONE_TEXT: Record<RateTone, string> = {
  met: 'text-status-done',
  near: 'text-status-received',
  short: 'text-destructive',
  none: 'text-muted-foreground',
};

type SortKey = 'member' | 'actual' | 'plan' | 'gap' | 'rate';

function sortValue(r: MemberRow, key: SortKey): number | string {
  switch (key) {
    case 'member': return r.member;
    case 'actual': return r.actual ?? -Infinity;
    case 'plan': return r.plan ?? -Infinity;
    case 'gap': return gap(r) ?? -Infinity;
    case 'rate': return r.rate ?? -Infinity;
  }
}

/** The same figures as a sortable table, for one dimension at a time. */
export function DetailTable({ selection }: { readonly selection: Selection }) {
  const [dimKey, setDimKey] = useState(DIMENSIONS[0].key);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'actual', desc: true });
  const dim = DIMENSIONS.find((d) => d.key === dimKey) ?? DIMENSIONS[0];
  const result = useModelRows(buildMembersQuery(dim, selection));

  const rows = result.state === 'error' || !result.rows ? [] : readMembers(result.rows, dim.order);
  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv, 'ko') : (av as number) - (bv as number);
    return sort.desc ? -cmp : cmp;
  });

  const head = (key: SortKey, label: string, right = true) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.desc ? 'descending' : 'ascending') : 'none'} className={cn('px-300 py-200 font-medium', right && 'text-right')}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : key !== 'member' }))}
        className="rounded px-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}{sort.key === key ? (sort.desc ? ' ↓' : ' ↑') : ''}
      </button>
    </th>
  );

  return (
    <section aria-label="상세 표" className="rounded-xl border border-border bg-card p-400">
      <header className="mb-300 flex flex-wrap items-center justify-between gap-300">
        <h3 className="text-400 font-semibold text-foreground">상세 보기</h3>
        <div role="group" aria-label="보기 기준" className="flex flex-wrap gap-100">
          {DIMENSIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              aria-pressed={d.key === dimKey}
              onClick={() => setDimKey(d.key)}
              className={cn(
                'rounded-full border px-300 py-100 text-[length:var(--text-200)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                d.key === dimKey ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-hover'
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </header>
      {result.state === 'error' ? (
        <QueryError message={result.message} detail={result.detail} onRetry={result.retry} />
      ) : result.state === 'loading' ? (
        <div role="status" aria-busy="true" aria-label="불러오는 중" className="h-32 animate-pulse rounded-lg bg-muted" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-300">
            <thead className="border-b border-border text-200 text-muted-foreground">
              <tr>{head('member', dim.label, false)}{head('actual', '실적')}{head('plan', '계획')}{head('gap', '차이')}{head('rate', '달성률')}</tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const diff = gap(r);
                return (
                  <tr key={r.member} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="px-300 py-200 text-left font-normal text-foreground">{r.member}</th>
                    <td className="px-300 py-200 text-right tabular-nums">{formatAmount(r.actual)}</td>
                    <td className="px-300 py-200 text-right tabular-nums">{formatAmount(r.plan)}</td>
                    <td className={cn('px-300 py-200 text-right tabular-nums', diff === null ? '' : diff >= 0 ? 'text-status-done' : 'text-destructive')}>
                      {diff === null ? '–' : `${diff > 0 ? '+' : ''}${formatAmount(diff)}`}
                    </td>
                    <td className={cn('px-300 py-200 text-right font-semibold tabular-nums', TONE_TEXT[rateTone(r)])}>{formatRate(r)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 ? <p className="py-400 text-center text-300 text-muted-foreground">조건에 맞는 데이터가 없습니다.</p> : null}
        </div>
      )}
    </section>
  );
}
