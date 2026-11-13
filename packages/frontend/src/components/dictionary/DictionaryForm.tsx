import { useId, useState } from 'react';

import { ErrorState } from '@/components/states';
import { FIELDS, validate, type Values } from '@/components/dictionary/form-config';
import { KIND_LABEL, type DictionaryKind } from '@/lib/dictionary';
import { cn } from '@/lib/utils';

const inputClass =
  'block w-full rounded-lg border border-input bg-card px-300 py-200 text-300 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

export interface DictionaryFormProps {
  readonly kind: DictionaryKind;
  readonly mode: 'create' | 'edit';
  readonly initial: Values;
  /** Categories already in use, offered as suggestions. */
  readonly categories: readonly string[];
  /** Saves the values; resolves to an error message, or null when saved. */
  readonly onSubmit: (values: Values) => Promise<string | null>;
  readonly onCancel: () => void;
}

export function DictionaryForm({
  kind,
  mode,
  initial,
  categories,
  onSubmit,
  onCancel,
}: DictionaryFormProps) {
  const uid = useId();
  const [values, setValues] = useState<Values>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const problem = validate(kind, values);
    if (problem) {
      setError(problem);
      return;
    }
    setPending(true);
    setError(null);
    try {
      // The parent closes the form when the save succeeds; it stays as typed otherwise.
      const message = await onSubmit(values);
      if (message) setError(message);
    } finally {
      setPending(false);
    }
  }

  const title = `${KIND_LABEL[kind]} ${mode === 'create' ? '등록' : '수정'}`;

  return (
    <form
      onSubmit={(e) => void submit(e)}
      aria-label={title}
      className="space-y-400 rounded-2xl border border-primary/40 bg-card p-500"
    >
      <h3 className="text-500 font-semibold text-foreground">{title}</h3>

      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-400 sm:grid-cols-2">
        {FIELDS[kind].map((field) => {
          const id = `${uid}-${field.name}`;
          const common = {
            id,
            value: values[field.name] ?? '',
            onChange: (
              e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
            ) => setValues((prev) => ({ ...prev, [field.name]: e.target.value })),
            disabled: pending,
            placeholder: field.placeholder,
            className: cn(inputClass, field.mono && 'font-monospace'),
          };
          return (
            <div key={field.name} className={cn(!field.half && 'sm:col-span-2')}>
              <label htmlFor={id} className="mb-100 block text-300 font-medium text-foreground">
                {field.label}
                {field.required ? (
                  <span aria-hidden="true" className="text-destructive">
                    {' '}
                    *
                  </span>
                ) : null}
              </label>
              {field.multiline ? (
                <textarea {...common} maxLength={field.max} rows={field.name === 'expression' ? 6 : 3} />
              ) : (
                <input
                  {...common}
                  type={field.numeric ? 'number' : 'text'}
                  inputMode={field.numeric ? 'numeric' : undefined}
                  min={field.numeric?.min}
                  max={field.numeric?.max}
                  maxLength={field.numeric ? undefined : field.max}
                  required={field.required}
                  list={field.suggestCategories ? `${uid}-categories` : undefined}
                />
              )}
              {field.hint ? (
                <p className="mt-100 text-200 text-muted-foreground">{field.hint}</p>
              ) : null}
            </div>
          );
        })}
      </div>
      <datalist id={`${uid}-categories`}>
        {categories.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="flex justify-end gap-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-lg px-400 py-200 text-300 font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-400 py-200 text-300 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? '저장 중…' : mode === 'create' ? '등록' : '저장'}
        </button>
      </div>
    </form>
  );
}
