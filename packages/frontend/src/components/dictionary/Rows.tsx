import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import type {
  StandardFormulaRecord,
  StandardTermRecord,
  StandardWordRecord,
} from '@rayfin-app/shared';

import { ConfirmDelete } from '@/components/states';
import { splitNames } from '@/lib/dictionary';
import { displayText, formatDateTime } from '@/lib/labels';
import { cn } from '@/lib/utils';

export interface RowActions {
  /** Only staff can change the dictionaries; the data service enforces it as well. */
  readonly staff: boolean;
  readonly confirming: boolean;
  readonly deleting: boolean;
  readonly onEdit: () => void;
  readonly onAskDelete: () => void;
  readonly onCancelDelete: () => void;
  readonly onConfirmDelete: () => void;
}

const buttonClass =
  'inline-flex items-center gap-100 whitespace-nowrap rounded-lg px-200 py-100 text-200 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function EntryButtons({ label, actions }: { label: string; actions: RowActions }) {
  if (!actions.staff) return null;
  return (
    <div className="flex shrink-0 items-center gap-100 md:justify-end">
      <button
        type="button"
        onClick={actions.onEdit}
        aria-label={`${label} 수정`}
        className={cn(buttonClass, 'text-foreground hover:bg-accent')}
      >
        <Pencil aria-hidden="true" className="icon-size-100" />
        수정
      </button>
      <button
        type="button"
        onClick={actions.onAskDelete}
        aria-label={`${label} 삭제`}
        className={cn(buttonClass, 'text-destructive hover:bg-destructive/10')}
      >
        <Trash2 aria-hidden="true" className="icon-size-100" />
        삭제
      </button>
    </div>
  );
}

function DeleteConfirm({ label, noun, actions }: { label: string; noun: string; actions: RowActions }) {
  if (!actions.confirming) return null;
  return (
    <div className="mt-300">
      <ConfirmDelete
        label={label}
        noun={noun}
        pending={actions.deleting}
        onCancel={actions.onCancelDelete}
        onConfirm={actions.onConfirmDelete}
      />
    </div>
  );
}

function UpdatedLine({ by, at }: { by: string; at: Date }) {
  return (
    <p className="mt-200 text-200 text-muted-foreground">
      {displayText(by)} · {formatDateTime(at)} 수정
    </p>
  );
}

export function ColumnHeader({ columns }: { readonly columns: string }) {
  const labels = columns.split('|');
  return (
    <div
      aria-hidden="true"
      className="hidden gap-x-400 px-300 text-200 font-medium text-muted-foreground md:grid md:grid-cols-[12rem_14rem_minmax(0,1fr)_10rem]"
    >
      {labels.map((label, i) => (
        <span key={i}>{label}</span>
      ))}
    </div>
  );
}

export function WordRow({ row, actions }: { row: StandardWordRecord; actions: RowActions }) {
  return (
    <li className="rounded-xl border border-border bg-card p-300">
      <div className="grid gap-x-400 gap-y-100 md:grid-cols-[12rem_14rem_minmax(0,1fr)_10rem] md:items-start">
        <span className="break-words font-monospace text-300 font-semibold text-foreground">
          {displayText(row.word)}
        </span>
        <span className="text-300 text-foreground">{displayText(row.formalName)}</span>
        <span className="text-300 text-muted-foreground">{displayText(row.description)}</span>
        <EntryButtons label={row.word} actions={actions} />
      </div>
      <DeleteConfirm label={row.word} noun="표준 단어" actions={actions} />
    </li>
  );
}

export function TermRow({ row, actions }: { row: StandardTermRecord; actions: RowActions }) {
  const related = splitNames(row.relatedWords);
  return (
    <li className="rounded-xl border border-border bg-card p-300">
      <div className="grid gap-x-400 gap-y-100 md:grid-cols-[12rem_14rem_minmax(0,1fr)_10rem] md:items-start">
        <span className="text-300 font-semibold text-foreground">{displayText(row.name)}</span>
        <span className="break-words font-monospace text-300 text-foreground">
          {displayText(row.abbreviation)}
        </span>
        <div className="space-y-200">
          <p className="whitespace-pre-wrap text-300 text-muted-foreground">
            {displayText(row.definition)}
          </p>
          {related.length > 0 ? (
            <p className="flex flex-wrap items-center gap-100 text-200 text-muted-foreground">
              관련 단어
              {related.map((word) => (
                <span
                  key={word}
                  className="rounded-md border border-border bg-muted px-200 py-100-nudge font-monospace"
                >
                  {word}
                </span>
              ))}
            </p>
          ) : null}
        </div>
        <EntryButtons label={row.name} actions={actions} />
      </div>
      <DeleteConfirm label={row.name} noun="표준 용어" actions={actions} />
    </li>
  );
}

/** Indentation by hierarchy depth, on wide screens only. Static class names for Tailwind. */
const INDENT = ['', 'md:ml-300', 'md:ml-600', 'md:ml-800', 'md:ml-800', 'md:ml-800'];

export function FormulaRow({
  row,
  actions,
  onSearch,
}: {
  row: StandardFormulaRecord;
  actions: RowActions;
  /** Searches the list for a formula this one uses. */
  onSearch: (name: string) => void;
}) {
  const uses = splitNames(row.dependsOn);
  const depth = Number.isFinite(row.depth) ? Math.max(0, Math.min(row.depth, 5)) : 0;
  const hasExpression = typeof row.expression === 'string' && row.expression.length > 0;
  return (
    <li
      className={cn(
        'rounded-xl border border-border bg-card p-300',
        depth === 0 && 'border-primary/50',
        INDENT[depth]
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-300 gap-y-100">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-200 gap-y-100">
            <span className="break-words font-monospace text-300 font-semibold text-foreground">
              {displayText(row.name)}
            </span>
            {row.title ? <span className="text-300 text-foreground">{row.title}</span> : null}
            {row.unit ? (
              <span className="rounded-md border border-border bg-muted px-200 py-100-nudge font-monospace text-200 text-muted-foreground">
                {row.unit}
              </span>
            ) : null}
          </p>
        </div>
        <EntryButtons label={row.name} actions={actions} />
      </div>

      {hasExpression ? (
        <pre className="mt-200 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-300 font-monospace text-[length:var(--text-200)] text-foreground">
          {row.expression}
        </pre>
      ) : null}

      {row.description ? (
        <p className="mt-200 whitespace-pre-wrap text-300 text-muted-foreground">{row.description}</p>
      ) : null}

      {uses.length > 0 ? (
        <p className="mt-200 flex flex-wrap items-center gap-100 text-200 text-muted-foreground">
          사용
          {uses.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onSearch(name)}
              className="rounded-md border border-border bg-card px-200 py-100-nudge font-monospace text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {name}
            </button>
          ))}
        </p>
      ) : null}

      {row.notes ? (
        <p className="mt-200 flex items-start gap-200 text-300 text-foreground">
          <AlertTriangle aria-hidden="true" className="icon-size-200 mt-100 shrink-0 text-destructive" />
          <span className="whitespace-pre-wrap">{row.notes}</span>
        </p>
      ) : null}

      <UpdatedLine by={row.updatedBy} at={row.updatedAt} />
      <DeleteConfirm label={row.name} noun="표준 계산식" actions={actions} />
    </li>
  );
}
