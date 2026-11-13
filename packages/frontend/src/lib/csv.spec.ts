import { describe, expect, it } from 'vitest';

import { csvCell, toCsv } from './csv';
import { buildRequestsCsv, EXPORT_HEADER, exportFilename, formatCsvDate } from './export-requests';

describe('csvCell', () => {
  it('quotes cells containing commas, quotes or line breaks', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('defuses spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('writes empty cells for missing values', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });
});

describe('toCsv', () => {
  it('starts with a byte-order mark and uses CRLF line breaks', () => {
    const csv = toCsv(['a', 'b'], [['1', '2']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('a,b\r\n1,2\r\n');
  });
});

describe('buildRequestsCsv', () => {
  it('writes readable labels and local dates', () => {
    const csv = buildRequestsCsv([
      {
        id: 'abcdef12-0000-0000-0000-000000000000',
        title: '매출, 합계 불일치',
        targetTable: 'Sales_Daily',
        urgency: 'urgent',
        status: 'analyzing',
        requesterEmail: 'a@b.com',
        createdAt: new Date(2026, 10, 13, 13, 5),
        symptom: undefined,
      },
    ]);
    const [header, row] = csv.slice(1).split('\r\n');
    expect(header).toBe(EXPORT_HEADER.join(','));
    expect(row).toBe('#ABCDEF,"매출, 합계 불일치",Sales_Daily,긴급,분석 중,a@b.com,2026-11-13 13:05,');
  });

  it('returns an empty string for dates it cannot read', () => {
    expect(formatCsvDate('not a date')).toBe('');
    expect(formatCsvDate(null)).toBe('');
  });
});

describe('exportFilename', () => {
  it('uses an ASCII name with the local date', () => {
    expect(exportFilename(new Date(2026, 10, 3))).toBe('requests_20261103.csv');
  });
});
