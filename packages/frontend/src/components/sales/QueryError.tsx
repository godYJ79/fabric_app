import { ErrorState } from '@/components/states';

/** A failed model query: what to do, and the model's own message for whoever has to fix it. */
export function QueryError({
  message,
  detail,
  onRetry,
}: {
  readonly message: string;
  readonly detail: string;
  readonly onRetry: () => void;
}) {
  return (
    <div className="space-y-200">
      <ErrorState message={message} onRetry={onRetry} />
      <details className="text-200 text-muted-foreground">
        <summary className="cursor-pointer">상세 내용</summary>
        <pre className="mt-100 whitespace-pre-wrap break-words rounded-lg bg-muted p-200">{detail}</pre>
      </details>
    </div>
  );
}
