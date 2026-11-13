import { describe, expect, it } from 'vitest';

import { blankValues, toInput, validate, valuesOf } from './form-config';

const NOW = new Date(2026, 10, 13, 12, 0);

describe('validate', () => {
  it('asks for required fields', () => {
    expect(validate('words', { word: '', category: '적재량' })).toContain('표준 단어');
    expect(validate('words', { word: 'DWT', category: '  ' })).toContain('분류');
    expect(validate('words', { word: 'DWT', category: '적재량' })).toBeNull();
  });

  it('keeps text within the stored length', () => {
    expect(validate('words', { word: 'x'.repeat(101), category: 'c' })).toContain('100자');
  });

  it('accepts only whole numbers in range for the hierarchy fields', () => {
    const base = { name: '@A', category: 'c', depth: '1', sortOrder: '10' };
    expect(validate('formulas', base)).toBeNull();
    expect(validate('formulas', { ...base, depth: '9' })).toContain('0~8');
    expect(validate('formulas', { ...base, depth: '1.5' })).toContain('정수');
    expect(validate('formulas', { ...base, sortOrder: '-1' })).toContain('정수');
  });
});

describe('toInput', () => {
  it('trims words and stamps who changed it and when', () => {
    const input = toInput('words', { word: ' DWT ', formalName: '', description: ' d ', category: ' c ' }, 'a@b.c', NOW);
    expect(input).toEqual({
      word: 'DWT', formalName: '', description: 'd', category: 'c', updatedAt: NOW, updatedBy: 'a@b.c',
    });
  });

  it('keeps line breaks and indentation inside an expression', () => {
    const input = toInput(
      'formulas',
      { name: '@A', category: 'c', depth: '2', sortOrder: '30', expression: '\nA : x\n  B : y\n\n' },
      'a@b.c',
      NOW
    );
    expect(input.expression).toBe('A : x\n  B : y');
    expect(input.depth).toBe(2);
    expect(input.sortOrder).toBe(30);
  });
});

describe('values', () => {
  it('starts a new formula one level down, after the last one', () => {
    const rows = [{ id: '1', name: '@A', category: 'c', depth: 0, sortOrder: 70, updatedAt: NOW, updatedBy: 'x' }];
    expect(blankValues('formulas', rows)).toMatchObject({ depth: '1', sortOrder: '80', name: '' });
    expect(blankValues('words', [])).toEqual({ word: '', formalName: '', category: '', description: '' });
  });

  it('turns a saved row into editable text, with missing values as empty', () => {
    const values = valuesOf('terms', {
      id: '1', name: '적재량', definition: 'd', category: 'c', updatedAt: NOW, updatedBy: 'x',
    });
    expect(values).toMatchObject({ name: '적재량', abbreviation: '', relatedWords: '' });
  });
});
