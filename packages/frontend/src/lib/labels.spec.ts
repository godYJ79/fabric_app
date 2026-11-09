import { isStaffEmail } from '@rayfin-app/shared';
import { describe, expect, it } from 'vitest';

import { describeError } from './errors';
import {
  displayText,
  formatDateTime,
  statusLabel,
  ticketNumber,
  urgencyLabel,
} from './labels';

describe('labels', () => {
  it('translates stored codes and tolerates unknown values', () => {
    expect(statusLabel('received')).toBe('접수');
    expect(statusLabel('done')).toBe('처리 완료');
    expect(statusLabel('nonsense')).toBe('알 수 없음');
    expect(statusLabel(null)).toBe('알 수 없음');
    expect(urgencyLabel('urgent')).toBe('긴급');
    expect(urgencyLabel(undefined)).toBe('-');
  });

  it('never renders non-text values as text', () => {
    expect(displayText(null)).toBe('-');
    expect(displayText('')).toBe('-');
    expect(displayText({ a: 1 })).toBe('-');
    expect(displayText(['x'])).toBe('-');
    expect(displayText(42)).toBe('42');
    expect(displayText('ok')).toBe('ok');
  });

  it('formats dates from Date, ISO string and timestamp, and rejects junk', () => {
    const iso = '2026-11-09T01:00:00Z';
    const expected = formatDateTime(new Date(iso));
    expect(expected).not.toBe('-');
    expect(formatDateTime(iso)).toBe(expected);
    expect(formatDateTime(new Date(iso).getTime())).toBe(expected);
    expect(formatDateTime('not a date')).toBe('-');
    expect(formatDateTime(null)).toBe('-');
    expect(formatDateTime({})).toBe('-');
  });

  it('derives a short stable ticket number from the id', () => {
    expect(ticketNumber('abcdef12-3456-7890-abcd-ef1234567890')).toBe('#ABCDEF');
    expect(ticketNumber(undefined)).toBe('#------');
  });
});

describe('staff list', () => {
  it('matches case-insensitively and rejects empty values', () => {
    expect(isStaffEmail('YJSHIN@in4ucloud.com')).toBe(true);
    expect(isStaffEmail('someone@example.com')).toBe(false);
    expect(isStaffEmail('')).toBe(false);
    expect(isStaffEmail(undefined)).toBe(false);
  });
});

describe('describeError', () => {
  it('hides provider details and points to permissions when access is denied', () => {
    const quiet = () => {};
    const original = console.error;
    console.error = quiet;
    try {
      expect(describeError(new Error('403 Forbidden: policy denied'), 'save')).toContain(
        '권한'
      );
      const generic = describeError(new Error('boom 0xDEADBEEF'), 'load');
      expect(generic).not.toContain('0xDEADBEEF');
      expect(generic).toContain('불러오지 못했습니다');
    } finally {
      console.error = original;
    }
  });
});
