import type {
  StandardFormulaRecord,
  StandardTermRecord,
  StandardWordRecord,
} from '@rayfin-app/shared';

export type DictionaryKind = 'words' | 'terms' | 'formulas';

export interface RowMap {
  words: StandardWordRecord;
  terms: StandardTermRecord;
  formulas: StandardFormulaRecord;
}

export const KIND_LABEL: Record<DictionaryKind, string> = {
  words: '표준 단어',
  terms: '표준 용어',
  formulas: '표준 계산식',
};

/** What each dictionary calls the thing that must be unique. */
export const KEY_LABEL: Record<DictionaryKind, string> = {
  words: '표준 단어',
  terms: '용어명',
  formulas: '계산식 이름',
};

const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });

export function nameOf<K extends DictionaryKind>(kind: K, row: RowMap[K]): string {
  return kind === 'words'
    ? (row as StandardWordRecord).word
    : (row as StandardTermRecord | StandardFormulaRecord).name;
}

/** Lower-cased, trimmed and composed, so "Draft" and " draft " are the same name. */
export function normalizeName(value: string): string {
  return value.normalize('NFC').trim().toLowerCase();
}

/** The row that already uses this name, if any (ignoring the row being edited). */
export function findDuplicate<K extends DictionaryKind>(
  kind: K,
  rows: readonly RowMap[K][],
  name: string,
  exceptId?: string
): RowMap[K] | undefined {
  const wanted = normalizeName(name);
  return rows.find((row) => row.id !== exceptId && normalizeName(nameOf(kind, row)) === wanted);
}

/** True when every whitespace-separated word of the query appears somewhere in the fields. */
export function matchesQuery(fields: readonly (string | undefined | null)[], query: string): boolean {
  const tokens = normalizeName(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalizeName(fields.filter(Boolean).join('\n'));
  return tokens.every((token) => haystack.includes(token));
}

export function searchFields<K extends DictionaryKind>(kind: K, row: RowMap[K]): (string | undefined)[] {
  if (kind === 'words') {
    const r = row as StandardWordRecord;
    return [r.word, r.formalName, r.description, r.category];
  }
  if (kind === 'terms') {
    const r = row as StandardTermRecord;
    return [r.name, r.abbreviation, r.definition, r.category, r.relatedWords];
  }
  const r = row as StandardFormulaRecord;
  return [r.name, r.title, r.unit, r.expression, r.description, r.dependsOn, r.notes, r.category];
}

/** Words and terms by category then name; formulas in their hierarchy order. */
export function sortRows<K extends DictionaryKind>(kind: K, rows: readonly RowMap[K][]): RowMap[K][] {
  const copy = [...rows];
  if (kind === 'formulas') {
    (copy as StandardFormulaRecord[]).sort(
      (a, b) => a.sortOrder - b.sortOrder || collator.compare(a.name, b.name)
    );
    return copy;
  }
  copy.sort(
    (a, b) =>
      collator.compare(
        (a as StandardWordRecord).category,
        (b as StandardWordRecord).category
      ) || collator.compare(nameOf(kind, a), nameOf(kind, b))
  );
  return copy;
}

export interface CategoryCount {
  name: string;
  count: number;
}

/** Categories in the order they first appear in `rows`, with how many rows each has. */
export function categoriesOf(rows: readonly { category: string }[]): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count }));
}

/** Names listed in a comma-separated field. */
export function splitNames(value: string | undefined | null): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/** The next free hierarchy position: 10 after the largest one in use. */
export function nextSortOrder(rows: readonly StandardFormulaRecord[]): number {
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), 0) + 10;
}
