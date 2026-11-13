import type { MouseEvent } from 'react';

import { QueryError } from '@/components/sales/QueryError';
import { useModelRows } from '@/hooks/use-model-rows';
import {
  buildMembersQuery,
  formatCompact,
  formatRate,
  rateTone,
  readMembers,
  type DimensionDef,
  type RateTone,
  type Selection,
} from '@/lib/sales-model';
import { cn } from '@/lib/utils';

const RATE_PILL: Record<RateTone, string> = {
  met: 'bg-status-done/15 text-status-done',
  near: 'bg-status-received/15 text-status-received',
  short: 'bg-destructive/15 text-destructive',
  none: 'bg-muted text-muted-foreground',
};

/**
 * One dimension: 실적 and 계획 side by side for each member, with the 달성률 beside them.
 * Clicking a member filters every other chart and the totals; Ctrl/⌘/Shift-click picks several.
 * Members of this chart that are not picked fade, and the chart itself keeps showing all members.
 */
export function DimensionCard({
  dim,
  selection,
  onPick,
}: {
  readonly dim: DimensionDef;
  readonly selection: Selection;
  readonly onPick: (key: string, member: string, additive: boolean) => void;
}) {
  const result = useModelRows(buildMembersQuery(dim, selection));
  const picked = selection[dim.key] ?? [];

  const rows = result.state === 'error' || !result.rows ? [] : readMembers(result.rows);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.actual ?? 0, r.plan ?? 0)));
  const refreshing = result.state === 'ready' && result.refreshing;

  const click = (member: string) => (e: MouseEvent) => onPick(dim.key, member, e.ctrlKey || e.metaKey || e.shiftKey);

  return (
    <section aria-label={`${dim.label}별 실적과 계획`} className="rounded-xl border border-border bg-card p-400">
      <header className="mb-300 flex items-baseline justify-between gap-300">
        <h3 className="text-400 font-semibold text-foreground">{dim.label}별</h3>
        <p className="flex items-center gap-300 text-200 text-muted-foreground">
          <span className="flex items-center gap-100"><i className="inline-block size-2 rounded-sm bg-brand" aria-hidden="true" />실적</span>
          <span className="flex items-center gap-100"><i className="inline-block size-2 rounded-sm border border-brand bg-transparent" aria-hidden="true" />계획</span>
        </p>
      </header>

      {result.state === 'error' ? (
        <QueryError message={result.message} detail={result.detail} onRetry={result.retry} />
      ) : result.state === 'loading' ? (
        <div role="status" aria-busy="true" aria-label="불러오는 중" className="space-y-200">
          {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-400 text-center text-300 text-muted-foreground">조건에 맞는 데이터가 없습니다.</p>
      ) : (
        <ul className={cn('space-y-100', refreshing && 'opacity-60 transition-opacity')} aria-busy={refreshing}>
          {rows.map((r) => {
            const isPicked = picked.includes(r.member);
            const faded = picked.length > 0 && !isPicked;
            return (
              <li key={r.member}>
                <button
                  type="button"
                  aria-pressed={isPicked}
                  onClick={click(r.member)}
                  className={cn(
                    'grid w-full grid-cols-[minmax(4rem,7rem)_1fr_auto] items-center gap-300 rounded-lg px-200 py-100 text-left transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isPicked && 'bg-accent',
                    faded && 'opacity-40'
                  )}
                >
                  <span className="truncate text-300 text-foreground" title={r.member}>{r.member}</span>
                  <span className="space-y-100-nudge" aria-hidden="true">
                    <span className="block h-2 rounded-r bg-brand" style={{ width: `${((r.actual ?? 0) / max) * 100}%` }} />
                    <span className="block h-2 rounded-r border border-brand" style={{ width: `${((r.plan ?? 0) / max) * 100}%` }} />
                  </span>
                  <span className="flex flex-col items-end gap-100">
                    <span className="text-200 text-foreground">
                      {formatCompact(r.actual)} <span className="text-muted-foreground">/ {formatCompact(r.plan)}</span>
                    </span>
                    <span className={cn('rounded-full px-200 text-200 font-semibold', RATE_PILL[rateTone(r)])}>{formatRate(r)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
