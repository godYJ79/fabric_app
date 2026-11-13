import type { RequestStatus, RequestUrgency } from '@rayfin-app/shared';

/** Stored values are ASCII codes; these are what people read. */
export const STATUS_LABEL: Record<RequestStatus, string> = {
  received: '접수',
  analyzing: '분석 중',
  done: '처리 완료',
};

export const URGENCY_LABEL: Record<RequestUrgency, string> = {
  low: '낮음',
  normal: '보통',
  urgent: '긴급',
};

/** Static class names so Tailwind can see them. */
export const STATUS_STYLE: Record<
  RequestStatus,
  { rail: string; dot: string; text: string }
> = {
  received: {
    rail: 'border-l-status-received',
    dot: 'bg-status-received',
    text: 'text-status-received',
  },
  analyzing: {
    rail: 'border-l-status-analyzing',
    dot: 'bg-status-analyzing',
    text: 'text-status-analyzing',
  },
  done: {
    rail: 'border-l-status-done',
    dot: 'bg-status-done',
    text: 'text-status-done',
  },
};

const FALLBACK_STYLE = STATUS_STYLE.received;

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === 'string' && value in STATUS_LABEL;
}

export function isRequestUrgency(value: unknown): value is RequestUrgency {
  return typeof value === 'string' && value in URGENCY_LABEL;
}

export function statusLabel(value: unknown): string {
  return isRequestStatus(value) ? STATUS_LABEL[value] : '알 수 없음';
}

export function urgencyLabel(value: unknown): string {
  return isRequestUrgency(value) ? URGENCY_LABEL[value] : '-';
}

export function statusStyle(value: unknown) {
  return isRequestStatus(value) ? STATUS_STYLE[value] : FALLBACK_STYLE;
}

/** Text that is safe to render: rows written before a field existed can hold null. */
export function displayText(value: unknown, fallback = '-'): string {
  if (typeof value === 'string') return value.length > 0 ? value : fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Accepts a Date, an ISO string, or a timestamp; returns '-' for anything else. */
export function formatDateTime(value: unknown): string {
  if (value === null || value === undefined) return '-';
  const date =
    value instanceof Date
      ? value
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return dateTimeFormatter.format(date);
}

/** A short, stable ticket number derived from the row id. */
export function ticketNumber(id: unknown): string {
  if (typeof id !== 'string') return '#------';
  const compact = id.replace(/[^0-9a-zA-Z]/g, '');
  return compact ? `#${compact.slice(0, 6).toUpperCase()}` : '#------';
}

const STATUS_CHANGE_PREFIX = '[상태 변경]';

/** The comment recorded automatically when staff change a request's status. */
export function statusChangeNote(from: unknown, to: unknown): string {
  return `${STATUS_CHANGE_PREFIX} ${statusLabel(from)} → ${statusLabel(to)}`;
}

export function isStatusChangeNote(body: unknown): boolean {
  return typeof body === 'string' && body.startsWith(STATUS_CHANGE_PREFIX);
}
