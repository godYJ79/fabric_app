import { Download, RefreshCw, Search } from 'lucide-react';
import { REQUEST_URGENCIES } from '@rayfin-app/shared';

import { URGENCY_LABEL } from '@/lib/labels';
import {
  PERIOD_LABEL,
  type PeriodFilter,
  type RequestFilters,
  type UrgencyFilter,
} from '@/lib/query';
import { cn } from '@/lib/utils';

const PERIODS = Object.keys(PERIOD_LABEL) as PeriodFilter[];

const selectClass =
  'rounded-lg border border-input bg-card px-300 py-200 text-300 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function clock(date: Date): string {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export interface FilterBarProps {
  readonly filters: RequestFilters;
  readonly searchText: string;
  readonly isStaff: boolean;
  readonly loadedAt: Date | null;
  readonly refreshing: boolean;
  readonly exporting: boolean;
  readonly exportMessage: string | null;
  readonly canReset: boolean;
  readonly onSearchText: (text: string) => void;
  readonly onChange: (patch: Partial<RequestFilters>) => void;
  readonly onRefresh: () => void;
  readonly onExport: () => void;
  readonly onReset: () => void;
}

export function FilterBar(props: FilterBarProps) {
  const { filters, loadedAt } = props;
  return (
    <div className="space-y-200">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="icon-size-200 pointer-events-none absolute left-300 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          aria-label="요청 검색"
          value={props.searchText}
          onChange={(e) => props.onSearchText(e.target.value)}
          maxLength={100}
          placeholder="제목, 대상 테이블, 요청자 검색"
          className="block w-full rounded-lg border border-input bg-card py-200 pl-800 pr-300 text-300 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-wrap items-center gap-200">
        <select
          aria-label="긴급도 필터"
          value={filters.urgency}
          onChange={(e) => props.onChange({ urgency: e.target.value as UrgencyFilter })}
          className={selectClass}
        >
          <option value="all">전체 긴급도</option>
          {REQUEST_URGENCIES.map((value) => (
            <option key={value} value={value}>
              {URGENCY_LABEL[value]}
            </option>
          ))}
        </select>
        <select
          aria-label="기간 필터"
          value={filters.period}
          onChange={(e) => props.onChange({ period: e.target.value as PeriodFilter })}
          className={selectClass}
        >
          {PERIODS.map((value) => (
            <option key={value} value={value}>
              {PERIOD_LABEL[value]}
            </option>
          ))}
        </select>
        {props.isStaff ? (
          <label className="inline-flex cursor-pointer items-center gap-200 text-300 text-foreground">
            <input
              type="checkbox"
              checked={filters.mineOnly}
              onChange={(e) => props.onChange({ mineOnly: e.target.checked })}
              className="accent-primary"
            />
            내가 등록한 것만
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-200">
        <span className="text-200 text-muted-foreground">
          {loadedAt ? `${clock(loadedAt)} 기준` : ''}
        </span>
        <div className="flex items-center gap-100">
          {props.canReset ? (
            <button
              type="button"
              onClick={props.onReset}
              className="rounded-lg px-200 py-100 text-200 font-medium text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              필터 초기화
            </button>
          ) : null}
          <button
            type="button"
            onClick={props.onRefresh}
            disabled={props.refreshing}
            aria-label="새로고침"
            className="rounded-lg p-200 text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <RefreshCw
              aria-hidden="true"
              className={cn('icon-size-200', props.refreshing && 'animate-spin')}
            />
          </button>
          <button
            type="button"
            onClick={props.onExport}
            disabled={props.exporting}
            className="inline-flex items-center gap-100 rounded-lg border border-border bg-card px-300 py-100 text-200 font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <Download aria-hidden="true" className="icon-size-100" />
            {props.exporting ? '내보내는 중…' : 'CSV 내보내기'}
          </button>
        </div>
      </div>

      {props.exportMessage ? (
        <p role="status" className="text-200 text-muted-foreground">
          {props.exportMessage}
        </p>
      ) : null}
    </div>
  );
}
