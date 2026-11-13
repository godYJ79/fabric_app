import { describe, expect, it } from 'vitest';

import {
  buildMembersQuery,
  buildTotalsQuery,
  DIMENSIONS,
  filterArgs,
  formatCompact,
  formatRate,
  gap,
  rateTone,
  readMembers,
  readTotals,
  toggleMember,
} from '@/lib/sales-model';

const corp = DIMENSIONS.find((d) => d.key === 'corporation')!;
const affiliate = DIMENSIONS.find((d) => d.key === 'affiliate')!;

describe('queries', () => {
  it('asks for the plain totals when nothing is picked', () => {
    expect(buildTotalsQuery({})).toBe('EVALUATE\nROW("실적", [실적], "계획", [계획], "달성률", [달성률])');
  });

  it('filters the totals by every picked member, quoting safely', () => {
    const q = buildTotalsQuery({ corporation: ['A "법인"', 'B'], year: ['2025'] });
    expect(q).toContain('CALCULATETABLE(');
    expect(q).toContain(`TREATAS({"A ""법인""", "B"}, 'D_Corporation'[법인])`);
    expect(q).toContain(`TREATAS({"2025"}, 'D_Calendar'[년도명])`);
  });

  it("leaves a chart's own dimension unfiltered so it can highlight instead", () => {
    const selection = { corporation: ['A'], affiliate: ['X'] };
    expect(filterArgs(selection, 'corporation')).toEqual([`TREATAS({"X"}, 'D_Affiliate'[계열사])`]);
    const q = buildMembersQuery(corp, selection);
    expect(q).toContain(`'D_Corporation'[법인],`);
    expect(q).toContain(`TREATAS({"X"}, 'D_Affiliate'[계열사]),`);
    expect(q).not.toContain('TREATAS({"A"}');
    expect(q.trim().endsWith(')')).toBe(true);
  });

  it('has one members query per dimension', () => {
    expect(buildMembersQuery(affiliate, {})).toBe(
      `EVALUATE\nSUMMARIZECOLUMNS(\n  'D_Affiliate'[계열사],\n  "실적", [실적], "계획", [계획], "달성률", [달성률]\n)`
    );
  });
});

describe('results', () => {
  it('reads the totals row and treats blanks as missing', () => {
    expect(readTotals([[100, 80, 1.25]])).toEqual({ actual: 100, plan: 80, rate: 1.25 });
    expect(readTotals([[null, '', undefined]])).toEqual({ actual: null, plan: null, rate: null });
    expect(readTotals([])).toBeNull();
  });

  it('reads members sorted by 실적 and names a blank member', () => {
    const rows = readMembers([
      ['B', 10, 20, 0.5],
      [null, 5, null, null],
      ['A', 30, 20, 1.5],
    ]);
    expect(rows.map((r) => r.member)).toEqual(['A', 'B', '(공백)']);
    expect(rows[2]).toEqual({ member: '(공백)', actual: 5, plan: null, rate: null });
  });

  it('lists a by-name dimension in name order', () => {
    const rows = readMembers([['2023년', 9, 1, 1], ['2021년', 1, 1, 1], ['2022년', 5, 1, 1]], 'name');
    expect(rows.map((r) => r.member)).toEqual(['2021년', '2022년', '2023년']);
  });

  it('computes the gap only when both figures exist', () => {
    expect(gap({ actual: 10, plan: 4, rate: null })).toBe(6);
    expect(gap({ actual: 10, plan: null, rate: null })).toBeNull();
  });
});

describe('selection', () => {
  it('picks one member, replaces it on another click, and clears it on a repeat click', () => {
    let s = toggleMember({}, 'corporation', 'A', false);
    expect(s).toEqual({ corporation: ['A'] });
    s = toggleMember(s, 'corporation', 'B', false);
    expect(s).toEqual({ corporation: ['B'] });
    s = toggleMember(s, 'corporation', 'B', false);
    expect(s).toEqual({});
  });

  it('adds and removes members with the additive modifier', () => {
    let s = toggleMember({}, 'year', '2024', true);
    s = toggleMember(s, 'year', '2025', true);
    expect(s).toEqual({ year: ['2024', '2025'] });
    s = toggleMember(s, 'year', '2024', true);
    expect(s).toEqual({ year: ['2025'] });
  });
});

describe('formatting', () => {
  it('shortens big numbers in 억/만', () => {
    expect(formatCompact(123_000_000)).toBe('1.2억');
    expect(formatCompact(34_000)).toBe('3.4만');
    expect(formatCompact(5600)).toBe('5,600');
    expect(formatCompact(null)).toBe('–');
  });

  it('reads the rate scale from the figures', () => {
    expect(formatRate({ actual: 93, plan: 100, rate: 0.93 })).toBe('93.0%');
    expect(formatRate({ actual: 93, plan: 100, rate: 93 })).toBe('93.0%');
    expect(formatRate({ actual: null, plan: null, rate: 0.5 })).toBe('50.0%');
    expect(formatRate({ actual: 1, plan: 2, rate: null })).toBe('–');
  });

  it('classes the attainment', () => {
    expect(rateTone({ actual: 100, plan: 100, rate: 1 })).toBe('met');
    expect(rateTone({ actual: 95, plan: 100, rate: 0.95 })).toBe('near');
    expect(rateTone({ actual: 50, plan: 100, rate: 0.5 })).toBe('short');
    expect(rateTone({ actual: 1, plan: 1, rate: null })).toBe('none');
  });
});
