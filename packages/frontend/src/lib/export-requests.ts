import type { DataRequestRecord } from '@rayfin-app/shared';

import { toCsv } from '@/lib/csv';
import { statusLabel, ticketNumber, urgencyLabel } from '@/lib/labels';

export type ExportRow = Pick<
  DataRequestRecord,
  | 'id'
  | 'title'
  | 'targetTable'
  | 'urgency'
  | 'status'
  | 'requesterEmail'
  | 'createdAt'
  | 'symptom'
>;

const pad = (n: number) => String(n).padStart(2, '0');

/** `2026-11-13 13:43` in the browser's time zone; empty when the value is not a date. */
export function formatCsvDate(value: unknown): string {
  const date =
    value instanceof Date
      ? value
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const EXPORT_HEADER = [
  '번호',
  '제목',
  '대상 테이블',
  '긴급도',
  '상태',
  '요청자',
  '등록 일시',
  '증상 및 상세 내용',
] as const;

export function buildRequestsCsv(rows: readonly ExportRow[]): string {
  return toCsv(
    EXPORT_HEADER,
    rows.map((row) => [
      ticketNumber(row.id),
      row.title,
      row.targetTable,
      urgencyLabel(row.urgency),
      statusLabel(row.status),
      row.requesterEmail,
      formatCsvDate(row.createdAt),
      row.symptom ?? '',
    ])
  );
}

export function exportFilename(now: Date = new Date()): string {
  // ASCII only: some browsers replace a non-ASCII download name with "download".
  return `requests_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.csv`;
}
