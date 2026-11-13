import type { RequestFilters } from '@/lib/query';
import type { StatusCounts } from '@/lib/summary';
import { cn } from '@/lib/utils';

interface Card {
  key: string;
  label: string;
  value: number | undefined;
  patch: Partial<RequestFilters>;
  active: boolean;
  /** Draws attention: urgent work that is not finished. */
  alert?: boolean;
}

export function SummaryStrip({
  counts,
  truncated,
  failed,
  filters,
  onSelect,
}: {
  readonly counts: StatusCounts | null;
  readonly truncated: boolean;
  readonly failed: boolean;
  readonly filters: RequestFilters;
  readonly onSelect: (patch: Partial<RequestFilters>) => void;
}) {
  const cards: Card[] = [
    {
      key: 'all',
      label: '전체',
      value: counts?.total,
      patch: { status: 'all', urgency: 'all' },
      active: filters.status === 'all' && filters.urgency === 'all',
    },
    {
      key: 'received',
      label: '접수',
      value: counts?.received,
      patch: { status: 'received' },
      active: filters.status === 'received',
    },
    {
      key: 'analyzing',
      label: '분석 중',
      value: counts?.analyzing,
      patch: { status: 'analyzing' },
      active: filters.status === 'analyzing',
    },
    {
      key: 'done',
      label: '처리 완료',
      value: counts?.done,
      patch: { status: 'done' },
      active: filters.status === 'done',
    },
    {
      key: 'urgent',
      label: '긴급 미처리',
      value: counts?.urgentOpen,
      patch: { status: 'open', urgency: 'urgent' },
      active: filters.status === 'open' && filters.urgency === 'urgent',
      alert: true,
    },
  ];

  return (
    <section aria-label="요청 현황">
      <div className="grid grid-cols-2 gap-200 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            aria-pressed={card.active}
            onClick={() => onSelect(card.patch)}
            className={cn(
              'rounded-xl border p-300 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              card.active
                ? 'border-primary bg-accent'
                : 'border-border bg-card hover:bg-accent'
            )}
          >
            <span className="block text-200 text-muted-foreground">{card.label}</span>
            <span
              className={cn(
                'mt-100 block font-numeric text-[length:var(--text-600)] font-semibold',
                card.alert && (card.value ?? 0) > 0 && 'text-destructive'
              )}
            >
              {card.value === undefined
                ? '–'
                : `${card.value.toLocaleString('ko-KR')}${truncated ? '+' : ''}`}
            </span>
          </button>
        ))}
      </div>
      {failed ? (
        <p className="mt-200 text-200 text-muted-foreground">
          현황 숫자를 불러오지 못했습니다. 목록은 그대로 사용할 수 있습니다.
        </p>
      ) : truncated ? (
        <p className="mt-200 text-200 text-muted-foreground">
          요청이 많아 일부만 집계했습니다. 표시된 숫자는 최소값입니다.
        </p>
      ) : null}
    </section>
  );
}
