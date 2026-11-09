import { statusLabel, statusStyle, urgencyLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';

/** A colored dot and the status in words, so color is never the only signal. */
export function StatusBadge({ status }: { readonly status: unknown }) {
  const style = statusStyle(status);
  return (
    <span className="inline-flex items-center gap-100 text-200 font-medium text-foreground">
      <span
        aria-hidden="true"
        className={cn('inline-block h-200 w-200 rounded-full', style.dot)}
      />
      {statusLabel(status)}
    </span>
  );
}

export function UrgencyTag({ urgency }: { readonly urgency: unknown }) {
  const urgent = urgency === 'urgent';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-200 py-100-nudge font-monospace text-[length:var(--text-200)]',
        urgent
          ? 'border-destructive/50 bg-destructive/10 text-destructive'
          : 'border-border bg-muted text-muted-foreground'
      )}
    >
      {urgencyLabel(urgency)}
    </span>
  );
}
