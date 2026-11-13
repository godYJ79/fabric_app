import type { StandardFormulaRecord, StandardWordRecord } from '@rayfin-app/shared';
import { describe, expect, it } from 'vitest';

import {
  categoriesOf,
  findDuplicate,
  matchesQuery,
  nextSortOrder,
  searchFields,
  sortRows,
  splitNames,
} from './dictionary';

const word = (id: string, w: string, category: string, extra: Partial<StandardWordRecord> = {}): StandardWordRecord => ({
  id, word: w, category, formalName: '', description: '', updatedAt: new Date(), updatedBy: 'a@b.c', ...extra,
});

const formula = (id: string, name: string, sortOrder: number): StandardFormulaRecord => ({
  id, name, category: 'c', depth: 0, sortOrder, updatedAt: new Date(), updatedBy: 'a@b.c',
});

describe('matchesQuery', () => {
  it('matches case-insensitively across fields', () => {
    expect(matchesQuery(['Deadweight Tonnage', '재화중량톤수'], 'deadweight')).toBe(true);
    expect(matchesQuery(['Deadweight Tonnage', '재화중량톤수'], '중량')).toBe(true);
  });

  it('requires every word of the query', () => {
    expect(matchesQuery(['Stowage Factor', '적부계수'], 'stowage 적부')).toBe(true);
    expect(matchesQuery(['Stowage Factor', '적부계수'], 'stowage 흘수')).toBe(false);
  });

  it('matches everything for an empty query and skips missing fields', () => {
    expect(matchesQuery([undefined, null, 'x'], '   ')).toBe(true);
    expect(matchesQuery([undefined, null], 'x')).toBe(false);
  });

  it('searches the fields that belong to each dictionary', () => {
    const w = word('1', 'DWT', '적재량', { formalName: 'Deadweight Tonnage', description: '재화중량톤수' });
    expect(matchesQuery(searchFields('words', w), 'tonnage 적재량')).toBe(true);
  });
});

describe('findDuplicate', () => {
  const rows = [word('1', 'DWT', 'a'), word('2', 'TPC', 'a')];

  it('ignores case and surrounding spaces', () => {
    expect(findDuplicate('words', rows, ' dwt ')?.id).toBe('1');
    expect(findDuplicate('words', rows, 'Draft')).toBeUndefined();
  });

  it('lets an entry keep its own name when it is edited', () => {
    expect(findDuplicate('words', rows, 'DWT', '1')).toBeUndefined();
    expect(findDuplicate('words', rows, 'DWT', '2')?.id).toBe('1');
  });
});

describe('sortRows and categoriesOf', () => {
  it('sorts words by category then name, naturally', () => {
    const sorted = sortRows('words', [
      word('1', 'Hold 10', '적재량'),
      word('2', 'Hold 2', '적재량'),
      word('3', 'ZZ', '선형'),
    ]);
    expect(sorted.map((r) => r.word)).toEqual(['ZZ', 'Hold 2', 'Hold 10']);
  });

  it('keeps formulas in hierarchy order', () => {
    const sorted = sortRows('formulas', [formula('1', 'b', 30), formula('2', 'a', 10), formula('3', 'c', 20)]);
    expect(sorted.map((r) => r.name)).toEqual(['a', 'c', 'b']);
  });

  it('lists categories in first-appearance order with counts', () => {
    expect(categoriesOf([{ category: 'x' }, { category: 'y' }, { category: 'x' }])).toEqual([
      { name: 'x', count: 2 },
      { name: 'y', count: 1 },
    ]);
  });
});

describe('small helpers', () => {
  it('splits comma-separated names', () => {
    expect(splitNames('DWT, Draft ,, TPC')).toEqual(['DWT', 'Draft', 'TPC']);
    expect(splitNames(undefined)).toEqual([]);
  });

  it('suggests the next sort position', () => {
    expect(nextSortOrder([])).toBe(10);
    expect(nextSortOrder([formula('1', 'a', 40), formula('2', 'b', 20)])).toBe(50);
  });
});
