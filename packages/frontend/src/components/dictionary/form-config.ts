import type {
  StandardFormulaRecord,
  StandardTermRecord,
  StandardWordRecord,
} from '@rayfin-app/shared';

import type { DictionaryKind, RowMap } from '@/lib/dictionary';
import { nextSortOrder } from '@/lib/dictionary';
import type { InputMap } from '@/lib/dictionary-queries';

export interface FieldDef {
  name: string;
  label: string;
  required?: boolean;
  /** Longest text allowed; mirrors @text({ max }) on the entity. */
  max: number;
  multiline?: boolean;
  mono?: boolean;
  hint?: string;
  placeholder?: string;
  /** Marks a whole-number field with its allowed range. */
  numeric?: { min: number; max: number };
  /** Offer the categories already in use as suggestions. */
  suggestCategories?: boolean;
  /** Two of these side by side on wide screens. */
  half?: boolean;
}

export type Values = Record<string, string>;

export const FIELDS: Record<DictionaryKind, readonly FieldDef[]> = {
  words: [
    { name: 'word', label: '표준 단어 (약어)', required: true, max: 100, half: true, placeholder: '예: DWT' },
    { name: 'formalName', label: '정식 명칭', max: 200, half: true, placeholder: '예: Deadweight Tonnage' },
    { name: 'category', label: '분류', required: true, max: 100, suggestCategories: true, placeholder: '예: 적재량' },
    { name: 'description', label: '설명', max: 1000, multiline: true },
  ],
  terms: [
    { name: 'name', label: '용어명', required: true, max: 200, half: true, placeholder: '예: 적재량' },
    { name: 'abbreviation', label: '영문 약어 / 영문명', max: 100, half: true, placeholder: '예: Loable qtty' },
    { name: 'category', label: '분류', required: true, max: 100, suggestCategories: true, placeholder: '예: 운임 계산' },
    { name: 'definition', label: '정의', required: true, max: 2000, multiline: true },
    { name: 'relatedWords', label: '관련 표준 단어', max: 500, hint: '표준 단어를 쉼표(,)로 구분해 적습니다. 예: DWT, Draft, TPC' },
  ],
  formulas: [
    { name: 'name', label: '계산식 이름', required: true, max: 200, half: true, mono: true, placeholder: '예: @Freight' },
    { name: 'title', label: '한글 이름', max: 200, half: true, placeholder: '예: 최종 해상운임' },
    { name: 'category', label: '분류 / 단계', required: true, max: 100, suggestCategories: true, placeholder: '예: [1] 적재량' },
    { name: 'unit', label: '단위', max: 50, half: true, placeholder: '예: $/MT' },
    { name: 'expression', label: '계산식', max: 4000, multiline: true, mono: true, hint: '여러 줄로 적을 수 있습니다.' },
    { name: 'description', label: '설명 / 조건', max: 2000, multiline: true },
    { name: 'dependsOn', label: '사용하는 계산식', max: 1000, hint: '계산식 이름을 쉼표(,)로 구분해 적습니다. 이름 안에는 쉼표를 쓰지 마세요.' },
    { name: 'notes', label: '주의 사항', max: 1000, multiline: true, hint: '확인이 필요한 부분이나 예외를 적습니다.' },
    { name: 'depth', label: '계층 깊이', required: true, max: 1, half: true, numeric: { min: 0, max: 8 }, hint: '0 = 최상위, 숫자가 클수록 안쪽으로 들여써서 보여줍니다.' },
    { name: 'sortOrder', label: '정렬 순서', required: true, max: 7, half: true, numeric: { min: 0, max: 1_000_000 }, hint: '작을수록 먼저 나옵니다.' },
  ],
};

export function blankValues(kind: DictionaryKind, rows: readonly RowMap[DictionaryKind][]): Values {
  const fields = FIELDS[kind];
  const values: Values = Object.fromEntries(fields.map((f) => [f.name, '']));
  if (kind === 'formulas') {
    values.depth = '1';
    values.sortOrder = String(nextSortOrder(rows as readonly StandardFormulaRecord[]));
  }
  return values;
}

export function valuesOf<K extends DictionaryKind>(kind: K, row: RowMap[K]): Values {
  const record = row as unknown as Record<string, unknown>;
  return Object.fromEntries(
    FIELDS[kind].map((f) => {
      const value = record[f.name];
      return [f.name, value === null || value === undefined ? '' : String(value)];
    })
  );
}

/** Turns what was typed into what is saved, stamping who changed it and when. */
export function toInput<K extends DictionaryKind>(
  kind: K,
  values: Values,
  updatedBy: string,
  now: Date = new Date()
): InputMap[K] {
  const text = (name: string) => (values[name] ?? '').trim();
  const stamp = { updatedAt: now, updatedBy };
  if (kind === 'words') {
    const input: Omit<StandardWordRecord, 'id'> = {
      word: text('word'),
      formalName: text('formalName'),
      description: text('description'),
      category: text('category'),
      ...stamp,
    };
    return input as InputMap[K];
  }
  if (kind === 'terms') {
    const input: Omit<StandardTermRecord, 'id'> = {
      name: text('name'),
      abbreviation: text('abbreviation'),
      definition: text('definition'),
      category: text('category'),
      relatedWords: text('relatedWords'),
      ...stamp,
    };
    return input as InputMap[K];
  }
  const input: Omit<StandardFormulaRecord, 'id'> = {
    name: text('name'),
    title: text('title'),
    unit: text('unit'),
    // Keep line breaks and indentation in the expression; only trim the ends.
    expression: (values.expression ?? '').replace(/\s+$/u, '').replace(/^\n+/u, ''),
    description: text('description'),
    dependsOn: text('dependsOn'),
    notes: text('notes'),
    category: text('category'),
    depth: Number(text('depth')),
    sortOrder: Number(text('sortOrder')),
    ...stamp,
  };
  return input as InputMap[K];
}

/** What is wrong with the typed values, or null when they can be saved. */
export function validate(kind: DictionaryKind, values: Values): string | null {
  for (const field of FIELDS[kind]) {
    const raw = (values[field.name] ?? '').trim();
    if (field.required && raw === '') return `${field.label}을(를) 입력해 주세요.`;
    if (field.numeric && raw !== '') {
      const n = Number(raw);
      const { min, max } = field.numeric;
      if (!Number.isInteger(n) || n < min || n > max) {
        return `${field.label}은(는) ${min}~${max} 사이의 정수여야 합니다.`;
      }
    }
    if (!field.numeric && raw.length > field.max) {
      return `${field.label}은(는) ${field.max}자까지 입력할 수 있습니다.`;
    }
  }
  return null;
}
