import type { PagedResult } from '@microsoft/rayfin-data';
import type {
  StandardFormulaRecord,
  StandardTermRecord,
  StandardWordRecord,
} from '@rayfin-app/shared';

import { FORMULA_SEEDS, TERM_SEEDS, WORD_SEEDS } from '@/seed/maritime-freight';
import { nameOf, normalizeName, type DictionaryKind, type RowMap } from '@/lib/dictionary';
import { drain, type Drained } from '@/lib/request-queries';
import { getRayfinClient } from '@/lib/rayfin-client';

/** Dictionaries are small; this is only a guard against reading without end. */
export const DICTIONARY_CAP = 5000;
const PAGE_SIZE = 500;

export type WordInput = Omit<StandardWordRecord, 'id'>;
export type TermInput = Omit<StandardTermRecord, 'id'>;
export type FormulaInput = Omit<StandardFormulaRecord, 'id'>;
export interface InputMap {
  words: WordInput;
  terms: TermInput;
  formulas: FormulaInput;
}

async function wordPage(cursor: string | null): Promise<PagedResult<StandardWordRecord>> {
  const client = await getRayfinClient();
  let query = client.data.StandardWord.select([
    'id', 'word', 'formalName', 'description', 'category', 'updatedAt', 'updatedBy',
  ])
    .orderBy({ id: 'asc' })
    .first(PAGE_SIZE);
  if (cursor) query = query.after(cursor);
  return (await query.executePaginated()) as PagedResult<StandardWordRecord>;
}

async function termPage(cursor: string | null): Promise<PagedResult<StandardTermRecord>> {
  const client = await getRayfinClient();
  let query = client.data.StandardTerm.select([
    'id', 'name', 'abbreviation', 'definition', 'category', 'relatedWords', 'updatedAt', 'updatedBy',
  ])
    .orderBy({ id: 'asc' })
    .first(PAGE_SIZE);
  if (cursor) query = query.after(cursor);
  return (await query.executePaginated()) as PagedResult<StandardTermRecord>;
}

async function formulaPage(cursor: string | null): Promise<PagedResult<StandardFormulaRecord>> {
  const client = await getRayfinClient();
  let query = client.data.StandardFormula.select([
    'id', 'name', 'title', 'unit', 'expression', 'description', 'dependsOn', 'notes',
    'category', 'depth', 'sortOrder', 'updatedAt', 'updatedBy',
  ])
    .orderBy({ id: 'asc' })
    .first(PAGE_SIZE);
  if (cursor) query = query.after(cursor);
  return (await query.executePaginated()) as PagedResult<StandardFormulaRecord>;
}

export const FETCHERS: { [K in DictionaryKind]: () => Promise<Drained<RowMap[K]>> } = {
  words: () => drain(wordPage, DICTIONARY_CAP),
  terms: () => drain(termPage, DICTIONARY_CAP),
  formulas: () => drain(formulaPage, DICTIONARY_CAP),
};

/** The service may return only some fields of a created row, so keep what was sent. */
export async function createEntry<K extends DictionaryKind>(
  kind: K,
  input: InputMap[K]
): Promise<RowMap[K]> {
  const client = await getRayfinClient();
  if (kind === 'words') {
    const created = await client.data.StandardWord.create(input as WordInput);
    return { ...input, ...created } as RowMap[K];
  }
  if (kind === 'terms') {
    const created = await client.data.StandardTerm.create(input as TermInput);
    return { ...input, ...created } as RowMap[K];
  }
  const created = await client.data.StandardFormula.create(input as FormulaInput);
  return { ...input, ...created } as RowMap[K];
}

export async function updateEntry<K extends DictionaryKind>(
  kind: K,
  id: string,
  input: InputMap[K]
): Promise<void> {
  const client = await getRayfinClient();
  if (kind === 'words') await client.data.StandardWord.update({ id }, input as WordInput);
  else if (kind === 'terms') await client.data.StandardTerm.update({ id }, input as TermInput);
  else await client.data.StandardFormula.update({ id }, input as FormulaInput);
}

export async function deleteEntry(kind: DictionaryKind, id: string): Promise<void> {
  const client = await getRayfinClient();
  if (kind === 'words') await client.data.StandardWord.delete({ id });
  else if (kind === 'terms') await client.data.StandardTerm.delete({ id });
  else await client.data.StandardFormula.delete({ id });
}

/** Seed entries for one dictionary as ready-to-save inputs. */
export function seedInputs<K extends DictionaryKind>(
  kind: K,
  updatedBy: string,
  now: Date = new Date()
): InputMap[K][] {
  if (kind === 'words') {
    return WORD_SEEDS.map((s) => ({
      word: s.word,
      formalName: s.formalName,
      description: s.description,
      category: s.category,
      updatedAt: now,
      updatedBy,
    })) as InputMap[K][];
  }
  if (kind === 'terms') {
    return TERM_SEEDS.map((s) => ({
      name: s.name,
      abbreviation: s.abbreviation,
      definition: s.definition,
      category: s.category,
      relatedWords: s.relatedWords,
      updatedAt: now,
      updatedBy,
    })) as InputMap[K][];
  }
  return FORMULA_SEEDS.map((s, index) => ({
    name: s.name,
    title: s.title,
    unit: s.unit,
    expression: s.expression,
    description: s.description,
    dependsOn: s.dependsOn,
    notes: s.notes,
    category: s.category,
    depth: s.depth,
    sortOrder: (index + 1) * 10,
    updatedAt: now,
    updatedBy,
  })) as InputMap[K][];
}

export interface SeedResult {
  created: number;
  skipped: number;
  failed: number;
}

const CHUNK = 5;

/**
 * Registers the source document's entries, skipping names that already exist.
 * Safe to run again: it only adds what is missing.
 */
export async function seedDictionary<K extends DictionaryKind>(
  kind: K,
  existing: readonly RowMap[K][],
  updatedBy: string,
  onProgress: (done: number, total: number) => void
): Promise<SeedResult> {
  const have = new Set(existing.map((row) => normalizeName(nameOf(kind, row))));
  const all = seedInputs(kind, updatedBy);
  const todo = all.filter(
    (input) => !have.has(normalizeName(nameOf(kind, input as unknown as RowMap[K])))
  );
  const result: SeedResult = { created: 0, skipped: all.length - todo.length, failed: 0 };
  onProgress(0, todo.length);
  for (let i = 0; i < todo.length; i += CHUNK) {
    const settled = await Promise.allSettled(
      todo.slice(i, i + CHUNK).map((input) => createEntry(kind, input))
    );
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') result.created += 1;
      else {
        result.failed += 1;
        console.error('[standards] seed entry failed', outcome.reason);
      }
    }
    onProgress(Math.min(i + CHUNK, todo.length), todo.length);
  }
  return result;
}
