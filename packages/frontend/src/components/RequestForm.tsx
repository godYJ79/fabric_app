import { useId, useState } from 'react';
import { REQUEST_URGENCIES, type RequestUrgency } from '@rayfin-app/shared';

import { ErrorState } from '@/components/states';
import type { CurrentUser } from '@/hooks/use-current-user';
import type { RequestSummary } from '@/hooks/use-requests';
import { describeError } from '@/lib/errors';
import { URGENCY_LABEL } from '@/lib/labels';
import { getRayfinClient } from '@/lib/rayfin-client';

// These limits mirror the @text({ max }) on the DataRequest entity.
const TITLE_MAX = 100;
const TARGET_MAX = 200;
const SYMPTOM_MAX = 2000;

const fieldClass =
  'block w-full rounded-lg border border-input bg-card px-300 py-200 text-300 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';
const labelClass = 'mb-100 block text-300 font-medium text-foreground';

export function RequestForm({
  user,
  onCreated,
  onCancel,
}: {
  readonly user: CurrentUser;
  readonly onCreated: (created: RequestSummary) => void;
  readonly onCancel: () => void;
}) {
  const uid = useId();
  const [title, setTitle] = useState('');
  const [targetTable, setTargetTable] = useState('');
  const [urgency, setUrgency] = useState<RequestUrgency>('normal');
  const [symptom, setSymptom] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && targetTable.trim().length > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || pending) return;
    setPending(true);
    setError(null);
    try {
      const client = await getRayfinClient();
      const input = {
        title: title.trim(),
        targetTable: targetTable.trim(),
        urgency,
        symptom: symptom.trim() || undefined,
        status: 'received' as const,
        // The service does not fill these in; the policy rejects any other user id.
        user_id: user.id,
        requesterEmail: user.email,
        createdAt: new Date(),
      };
      const created = await client.data.DataRequest.create(input);
      // The response may carry only some fields, so keep what was submitted.
      // On failure the form stays as typed; it is left only after a successful save.
      onCreated({ ...input, ...created } as RequestSummary);
    } catch (e) {
      setError(describeError(e, 'save'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="space-y-400 rounded-2xl border border-border bg-card p-500"
    >
      <h2 className="text-500 font-semibold text-foreground">새 요청 등록</h2>

      {error ? <ErrorState message={error} /> : null}

      <div>
        <label htmlFor={`${uid}-title`} className={labelClass}>
          제목
        </label>
        <input
          id={`${uid}-title`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="예: 11월 매출 합계가 보고서와 다릅니다"
          required
          disabled={pending}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor={`${uid}-target`} className={labelClass}>
          대상 테이블 또는 보고서
        </label>
        <input
          id={`${uid}-target`}
          value={targetTable}
          onChange={(e) => setTargetTable(e.target.value)}
          maxLength={TARGET_MAX}
          placeholder="예: Sales_Daily"
          required
          disabled={pending}
          className={fieldClass}
        />
      </div>

      <fieldset disabled={pending}>
        <legend className={labelClass}>긴급도</legend>
        <div className="flex flex-wrap gap-200">
          {REQUEST_URGENCIES.map((value) => (
            <label
              key={value}
              className="inline-flex cursor-pointer items-center gap-200 rounded-lg border border-border bg-card px-300 py-200 text-300 text-foreground has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name={`${uid}-urgency`}
                value={value}
                checked={urgency === value}
                onChange={() => setUrgency(value)}
                className="accent-primary"
              />
              {URGENCY_LABEL[value]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${uid}-symptom`} className={labelClass}>
          증상 및 상세 내용 <span className="text-muted-foreground">(선택)</span>
        </label>
        <textarea
          id={`${uid}-symptom`}
          value={symptom}
          onChange={(e) => setSymptom(e.target.value)}
          maxLength={SYMPTOM_MAX}
          rows={5}
          placeholder="언제부터, 어떤 값이 어떻게 다른지 알려 주세요."
          disabled={pending}
          className={fieldClass}
        />
        <p className="mt-100 text-right text-200 text-muted-foreground">
          {symptom.length}/{SYMPTOM_MAX}
        </p>
      </div>

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
          disabled={!canSubmit || pending}
          className="rounded-lg bg-primary px-400 py-200 text-300 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? '등록 중…' : '요청 등록'}
        </button>
      </div>
    </form>
  );
}
