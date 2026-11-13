import { cn } from '@/lib/utils';
import {
  buildTotalsQuery,
  formatAmount,
  formatRate,
  gap,
  rateTone,
  ratePercent,
  readTotals,
  type RateTone,
  type Selection,
} from '@/lib/sales-model';
import { useModelRows } from '@/hooks/use-model-rows';
import { QueryError } from '@/components/sales/QueryError';

const TONE_TEXT: Record<RateTone, string> = {
  met: 'text-status-done',
  near: 'text-status-received',
  short: 'text-destructive',
  none: 'text-muted-foreground',
};
const TONE_BAR: Record<RateTone, string> = {
  met: 'bg-status-done',
  near: 'bg-status-received',
  short: 'bg-destructive',
  none: 'bg-muted-foreground',
};

function Card({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-400">
      <p className="text-200 text-muted-foreground">{label}</p>
      <div className="mt-100">{children}</div>
    </div>
  );
}

/** 매출 실적 / 매출 계획 / 차이 / 달성률 for the current selection. */
export function KpiStrip({ selection }: { readonly selection: Selection }) {
  const result = useModelRows(buildTotalsQuery(selection));

  if (result.state === 'error') {
    return <QueryError message={result.message} detail={result.detail} onRetry={result.retry} />;
  }
  const loading = result.state === 'loading';
  const figures = result.rows ? readTotals(result.rows) : null;
  const dim = loading || (result.state === 'ready' && result.refreshing);
  const diff = figures ? gap(figures) : null;
  const tone = figures ? rateTone(figures) : 'none';
  const pct = figures ? ratePercent(figures) : null;

  return (
    <section
      aria-label="핵심 지표"
      aria-busy={dim}
      className={cn('grid gap-300 sm:grid-cols-2 xl:grid-cols-4', dim && 'opacity-60 transition-opacity')}
    >
      <Card label="매출 실적">
        <p className="text-hero-700 font-semibold text-foreground">{loading ? '…' : formatAmount(figures?.actual ?? null)}</p>
      </Card>
      <Card label="매출 계획">
        <p className="text-hero-700 font-semibold text-foreground">{loading ? '…' : formatAmount(figures?.plan ?? null)}</p>
      </Card>
      <Card label="계획 대비 차이">
        <p className={cn('text-hero-700 font-semibold', diff === null ? 'text-foreground' : diff >= 0 ? 'text-status-done' : 'text-destructive')}>
          {loading ? '…' : diff === null ? '–' : `${diff > 0 ? '+' : ''}${formatAmount(diff)}`}
        </p>
      </Card>
      <Card label="달성률">
        <p className={cn('text-hero-700 font-semibold', TONE_TEXT[tone])}>{loading || !figures ? '…' : formatRate(figures)}</p>
        <div className="mt-200 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className={cn('h-full rounded-full', TONE_BAR[tone])} style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }} />
        </div>
      </Card>
    </section>
  );
}
