import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

/** Loading holds the layout; empty is inviting; error is actionable. */

export function LoadingState({ rows = 3 }: { readonly rows?: number }) {
  return (
    <div
      className="space-y-200"
      role="status"
      aria-busy="true"
      aria-label="불러오는 중"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  readonly title: string;
  readonly hint?: string;
  readonly action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-200 rounded-xl border border-dashed border-border px-600 py-800 text-center">
      <p className="text-400 font-semibold text-foreground">{title}</p>
      {hint ? (
        <p className="max-w-sm text-300 text-muted-foreground">{hint}</p>
      ) : null}
      {action ? <div className="mt-200">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-300 rounded-xl border border-destructive/40 bg-destructive/10 px-400 py-300"
    >
      <AlertTriangle
        aria-hidden="true"
        className="icon-size-300 mt-100 shrink-0 text-destructive"
      />
      <p className="min-w-0 flex-1 text-300 text-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg px-200 py-100 text-200 font-semibold text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

/** Confirmation for an irreversible action. It names the thing being deleted. */
export function ConfirmDelete({
  label,
  noun = '요청',
  onConfirm,
  onCancel,
  pending,
}: {
  readonly label: string;
  /** What is being deleted, for the sentence: "<label> <noun>을 삭제할까요?" */
  readonly noun?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly pending?: boolean;
}) {
  return (
    <div
      role="alertdialog"
      aria-label={`${label} 삭제 확인`}
      className="flex flex-wrap items-center gap-300 rounded-xl border border-destructive/40 bg-destructive/10 px-400 py-300 text-300"
    >
      <span className="min-w-0 flex-1 text-foreground">
        <strong className="font-semibold">{label}</strong> {noun}을(를) 삭제할까요? 되돌릴
        수 없습니다.
      </span>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-lg px-300 py-100 font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        취소
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className="rounded-lg bg-destructive px-300 py-100 font-semibold text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {pending ? '삭제 중…' : '삭제'}
      </button>
    </div>
  );
}
