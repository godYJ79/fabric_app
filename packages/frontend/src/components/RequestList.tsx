import { Plus } from 'lucide-react';

import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { StatusBadge, UrgencyTag } from '@/components/StatusBadge';
import type { RequestSummary, StatusFilter, ListStatus } from '@/hooks/use-requests';
import {
  displayText,
  formatDateTime,
  statusStyle,
  STATUS_LABEL,
  ticketNumber,
} from '@/lib/labels';
import { cn } from '@/lib/utils';

const FILTERS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'received', label: STATUS_LABEL.received },
  { value: 'analyzing', label: STATUS_LABEL.analyzing },
  { value: 'done', label: STATUS_LABEL.done },
];

export interface RequestListProps {
  readonly items: readonly RequestSummary[];
  readonly status: ListStatus;
  readonly error: string | null;
  readonly filter: StatusFilter;
  readonly isStaff: boolean;
  readonly selectedId: string | null;
  readonly hasMore: boolean;
  readonly loadingMore: boolean;
  readonly loadMoreError: string | null;
  readonly onFilter: (filter: StatusFilter) => void;
  readonly onSelect: (id: string) => void;
  readonly onCreate: () => void;
  readonly onRetry: () => void;
  readonly onLoadMore: () => void;
}

export function RequestList(props: RequestListProps) {
  const {
    items,
    status,
    error,
    filter,
    isStaff,
    selectedId,
    hasMore,
    loadingMore,
    loadMoreError,
  } = props;

  // A status change made on the detail panel can leave a row that no longer
  // matches the active filter; drop it from view.
  const visible = items.filter((i) => filter === 'all' || i.status === filter);

  return (
    <div className="space-y-400">
      <div
        role="group"
        aria-label="상태 필터"
        className="flex flex-wrap gap-200"
      >
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => props.onFilter(f.value)}
            className={cn(
              'rounded-full border px-300 py-100 text-[length:var(--text-300)] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              filter === f.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground hover:bg-accent'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {status === 'loading' ? <LoadingState rows={4} /> : null}

      {status === 'error' && error ? (
        <ErrorState message={error} onRetry={props.onRetry} />
      ) : null}

      {status === 'ready' && visible.length === 0 ? (
        <EmptyState
          title={
            filter === 'all'
              ? isStaff
                ? '접수된 요청이 없습니다'
                : '아직 등록한 요청이 없습니다'
              : '이 상태의 요청이 없습니다'
          }
          hint={
            isStaff
              ? '요청자가 등록하면 여기에 표시됩니다.'
              : '데이터가 이상하거나 확인이 필요하면 요청을 남겨 주세요.'
          }
          action={
            filter === 'all' ? (
              <button
                type="button"
                onClick={props.onCreate}
                className="inline-flex items-center gap-200 rounded-lg bg-primary px-400 py-200 text-300 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Plus aria-hidden="true" className="icon-size-200" />새 요청 등록
              </button>
            ) : undefined
          }
        />
      ) : null}

      {status === 'ready' && visible.length > 0 ? (
        <ul className="space-y-200">
          {visible.map((item) => {
            const selected = item.id === selectedId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => props.onSelect(item.id)}
                  className={cn(
                    'w-full rounded-xl border border-l-4 bg-card p-300 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    statusStyle(item.status).rail,
                    selected ? 'border-y-primary border-r-primary bg-accent' : 'border-y-border border-r-border'
                  )}
                >
                  <div className="flex items-center justify-between gap-300">
                    <span className="font-monospace text-200 text-muted-foreground">
                      {ticketNumber(item.id)}
                    </span>
                    <UrgencyTag urgency={item.urgency} />
                  </div>
                  <p className="mt-100 truncate text-400 font-semibold text-foreground">
                    {displayText(item.title, '(제목 없음)')}
                  </p>
                  <div className="mt-200 flex flex-wrap items-center justify-between gap-x-300 gap-y-100">
                    <StatusBadge status={item.status} />
                    <span className="text-200 text-muted-foreground">
                      {isStaff ? `${displayText(item.requesterEmail)} · ` : ''}
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {status === 'ready' && hasMore ? (
        <div className="space-y-200">
          {loadMoreError ? <ErrorState message={loadMoreError} /> : null}
          <button
            type="button"
            onClick={props.onLoadMore}
            disabled={loadingMore}
            className="w-full rounded-lg border border-border bg-card px-400 py-200 text-300 font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            {loadingMore ? '불러오는 중…' : '더 보기'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
