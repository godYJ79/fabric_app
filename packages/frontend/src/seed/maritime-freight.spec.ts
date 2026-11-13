import { describe, expect, it } from 'vitest';

import { FORMULA_SEEDS, TERM_SEEDS, WORD_SEEDS } from './maritime-freight';

const lower = (s: string) => s.toLowerCase();
const dupes = (names: string[]) => names.filter((n, i) => names.findIndex((m) => lower(m) === lower(n)) !== i);

describe('maritime freight seed data', () => {
  it('has no duplicate names within each dictionary', () => {
    expect(dupes(WORD_SEEDS.map((x) => x.word))).toEqual([]);
    expect(dupes(TERM_SEEDS.map((x) => x.name))).toEqual([]);
    expect(dupes(FORMULA_SEEDS.map((x) => x.name))).toEqual([]);
  });

  it('keeps every field within the length the data model allows', () => {
    for (const x of WORD_SEEDS) {
      expect(x.word.length, x.word).toBeGreaterThan(0);
      expect(x.word.length, x.word).toBeLessThanOrEqual(100);
      expect(x.formalName.length, x.word).toBeLessThanOrEqual(200);
      expect(x.description.length, x.word).toBeLessThanOrEqual(1000);
      expect(x.category.length, x.word).toBeGreaterThan(0);
      expect(x.category.length, x.word).toBeLessThanOrEqual(100);
    }
    for (const x of TERM_SEEDS) {
      expect(x.name.length, x.name).toBeLessThanOrEqual(200);
      expect(x.abbreviation.length, x.name).toBeLessThanOrEqual(100);
      expect(x.definition.length, x.name).toBeGreaterThan(0);
      expect(x.definition.length, x.name).toBeLessThanOrEqual(2000);
      expect(x.relatedWords.length, x.name).toBeLessThanOrEqual(500);
    }
    for (const x of FORMULA_SEEDS) {
      expect(x.name.length, x.name).toBeLessThanOrEqual(200);
      expect(x.title.length, x.name).toBeLessThanOrEqual(200);
      expect(x.unit.length, x.name).toBeLessThanOrEqual(50);
      expect(x.expression.length, x.name).toBeLessThanOrEqual(4000);
      expect(x.description.length, x.name).toBeLessThanOrEqual(2000);
      expect(x.dependsOn.length, x.name).toBeLessThanOrEqual(1000);
      expect(x.notes.length, x.name).toBeLessThanOrEqual(1000);
      expect(x.category.length, x.name).toBeLessThanOrEqual(100);
      expect(x.depth, x.name).toBeGreaterThanOrEqual(0);
      expect(x.depth, x.name).toBeLessThanOrEqual(8);
    }
  });

  it('relates terms only to words that exist', () => {
    const words = new Set(WORD_SEEDS.map((x) => lower(x.word)));
    for (const term of TERM_SEEDS) {
      for (const related of term.relatedWords.split(',').map((s) => s.trim())) {
        expect(words.has(lower(related)), `${term.name} → ${related}`).toBe(true);
      }
    }
  });

  it('only points formulas at formulas that exist', () => {
    const names = new Set(FORMULA_SEEDS.map((x) => x.name));
    for (const formula of FORMULA_SEEDS) {
      if (!formula.dependsOn) continue;
      for (const dep of formula.dependsOn.split(',').map((s) => s.trim())) {
        expect(names.has(dep), `${formula.name} → ${dep}`).toBe(true);
      }
    }
  });

  it('uses no commas inside names, because related names are stored comma-separated', () => {
    for (const x of FORMULA_SEEDS) expect(x.name, x.name).not.toContain(',');
    for (const x of WORD_SEEDS.filter((w) => w.word.includes(','))) {
      // Words may contain commas (for example "Bod, FW, C"); terms refer to them by other words only.
      expect(TERM_SEEDS.some((t) => t.relatedWords.includes(x.word))).toBe(false);
    }
  });

  it('covers the seven source categories and the top-level measure', () => {
    expect(new Set(WORD_SEEDS.map((x) => x.category)).size).toBe(7);
    expect(FORMULA_SEEDS[0].name).toBe('@Freight');
    expect(FORMULA_SEEDS.filter((x) => x.depth === 0)).toHaveLength(1);
    expect(WORD_SEEDS.length).toBeGreaterThan(55);
    expect(FORMULA_SEEDS.length).toBeGreaterThan(45);
  });
});
