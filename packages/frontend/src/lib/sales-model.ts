/**
 * 판매 현황: what is asked of SementicModel_INZI and how the answers are read.
 *
 * Names below come from the model view of the semantic model (tables D_*, the measures
 * [실적] [계획] [달성률] in the @Measure table). They are confirmed against the model by the
 * "모델 점검" step of the view: a wrong name comes back as a query error, never as invented numbers.
 */

/** Connector alias in rayfin/rayfin.yml. */
export const SALES_CONNECTION = 'salesmodel';

export interface DimensionDef {
  readonly key: string;
  readonly label: string;
  readonly table: string;
  readonly column: string;
}

export const DIMENSIONS: readonly DimensionDef[] = [
  { key: 'affiliate', label: '계열사', table: 'D_Affiliate', column: '계열사' },
  { key: 'corporation', label: '법인', table: 'D_Corporation', column: '법인' },
  { key: 'division', label: '부문', table: 'D_Division', column: '부문' },
  { key: 'location', label: '국내/해외', table: 'D_Location', column: '국해외' },
  { key: 'year', label: '연도', table: 'D_Calendar', column: '년도명' },
  { key: 'quarter', label: '분기', table: 'D_Calendar', column: '분기명' },
];

/** The picked members per dimension key. A missing or empty list means "all". */
export type Selection = Readonly<Record<string, readonly string[]>>;

/** One row of figures. `rate` is the model's own 달성률 (null when the model returns blank). */
export interface Figures {
  readonly actual: number | null;
  readonly plan: number | null;
  readonly rate: number | null;
}

export interface MemberRow extends Figures {
  readonly member: string;
}

const MEASURES = '"실적", [실적], "계획", [계획], "달성률", [달성률]';

/** A DAX string literal. */
export function daxString(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function ref(dim: DimensionDef): string {
  return `'${dim.table}'[${dim.column}]`;
}

/**
 * Filter arguments for the picked members. The dimension in `except` is left out so that a chart
 * keeps showing all of its own members (the picked ones are highlighted instead).
 */
export function filterArgs(selection: Selection, except?: string): string[] {
  const args: string[] = [];
  for (const dim of DIMENSIONS) {
    const picked = selection[dim.key];
    if (dim.key === except || !picked || picked.length === 0) continue;
    args.push(`TREATAS({${picked.map(daxString).join(', ')}}, ${ref(dim)})`);
  }
  return args;
}

/** The three totals for the current selection. */
export function buildTotalsQuery(selection: Selection): string {
  const filters = filterArgs(selection);
  const row = `ROW(${MEASURES})`;
  return filters.length > 0
    ? `EVALUATE\nCALCULATETABLE(\n  ${row},\n  ${filters.join(',\n  ')}\n)`
    : `EVALUATE\n${row}`;
}

/** 실적 / 계획 / 달성률 for every member of one dimension, under the selection of all other dimensions. */
export function buildMembersQuery(dim: DimensionDef, selection: Selection): string {
  const filters = filterArgs(selection, dim.key);
  return [
    'EVALUATE',
    'SUMMARIZECOLUMNS(',
    `  ${ref(dim)},`,
    ...filters.map((f) => `  ${f},`),
    `  ${MEASURES}`,
    ')',
  ].join('\n');
}

/** A cell as a number: blank, text and non-finite values become null. */
export function toNumber(cell: unknown): number | null {
  if (cell === null || cell === undefined || cell === '') return null;
  const n = typeof cell === 'number' ? cell : Number(cell);
  return Number.isFinite(n) ? n : null;
}

/** Totals query result → one row of figures (null when the table has no row). */
export function readTotals(rows: readonly (readonly unknown[])[]): Figures | null {
  const row = rows[0];
  if (!row) return null;
  return { actual: toNumber(row[0]), plan: toNumber(row[1]), rate: toNumber(row[2]) };
}

/** Members query result (columns: member, 실적, 계획, 달성률) → rows, biggest 실적 first. */
export function readMembers(rows: readonly (readonly unknown[])[]): MemberRow[] {
  return rows
    .map((row) => ({
      member: row[0] === null || row[0] === undefined || row[0] === '' ? '(공백)' : String(row[0]),
      actual: toNumber(row[1]),
      plan: toNumber(row[2]),
      rate: toNumber(row[3]),
    }))
    .sort((a, b) => (b.actual ?? 0) - (a.actual ?? 0) || a.member.localeCompare(b.member, 'ko'));
}

/** 실적 − 계획 (null when either is missing). */
export function gap(f: Figures): number | null {
  return f.actual === null || f.plan === null ? null : f.actual - f.plan;
}

/** Selection helpers (pure, so they are easy to test). */
export function toggleMember(selection: Selection, key: string, member: string, additive: boolean): Selection {
  const current = selection[key] ?? [];
  const has = current.includes(member);
  let next: string[];
  if (additive) next = has ? current.filter((m) => m !== member) : [...current, member];
  else next = has && current.length === 1 ? [] : [member];
  const copy: Record<string, readonly string[]> = { ...selection };
  if (next.length === 0) delete copy[key];
  else copy[key] = next;
  return copy;
}

export function selectionCount(selection: Selection): number {
  return Object.values(selection).reduce((n, list) => n + list.length, 0);
}

// --- number formatting -------------------------------------------------------------------------

const intFmt = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });

/** Whole numbers with thousands separators; "–" when missing. The model's unit is kept as is. */
export function formatAmount(value: number | null): string {
  return value === null ? '–' : intFmt.format(Math.round(value));
}

/** Short form for axes and tight spaces: 1.2억 / 3,400만 / 5,600. */
export function formatCompact(value: number | null): string {
  if (value === null) return '–';
  const abs = Math.abs(value);
  if (abs >= 1e8) return `${trim(value / 1e8)}억`;
  if (abs >= 1e4) return `${trim(value / 1e4)}만`;
  return intFmt.format(Math.round(value));
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/**
 * 달성률 as a percent. The model may return 0.93 or 93, so the scale is read off the figures
 * (실적 ÷ 계획) when both exist; otherwise values up to 10 are taken as fractions.
 */
export function ratePercent(f: Figures): number | null {
  if (f.rate === null) return null;
  if (f.actual !== null && f.plan !== null && f.plan !== 0) {
    const ratio = f.actual / f.plan;
    return Math.abs(f.rate - ratio) <= Math.abs(f.rate - ratio * 100) ? f.rate * 100 : f.rate;
  }
  return Math.abs(f.rate) <= 10 ? f.rate * 100 : f.rate;
}

export function formatRate(f: Figures): string {
  const p = ratePercent(f);
  return p === null ? '–' : `${p.toFixed(1)}%`;
}

/** Tone of an attainment rate for colour and wording. */
export type RateTone = 'met' | 'near' | 'short' | 'none';
export function rateTone(f: Figures): RateTone {
  const p = ratePercent(f);
  if (p === null) return 'none';
  if (p >= 100) return 'met';
  if (p >= 90) return 'near';
  return 'short';
}
