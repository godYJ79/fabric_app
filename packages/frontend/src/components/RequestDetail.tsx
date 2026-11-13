import { useId, useState } from 'react';
import { ArrowLeft, History, Link2, Trash2 } from 'lucide-react';
import {
  REQUEST_STATUSES,
  type RequestCommentRecord,
  type RequestStatus,
} from '@rayfin-app/shared';

import { ConfirmDelete, EmptyState, ErrorState, LoadingState } from '@/components/states';
import { StatusBadge, UrgencyTag } from '@/components/StatusBadge';
import type { CurrentUser } from '@/hooks/use-current-user';
import { useRequestDetail } from '@/hooks/use-request-detail';
import type { RequestSummary } from '@/hooks/use-requests';
import { describeError } from '@/lib/errors';
import {
  displayText,
  formatDateTime,
  isStatusChangeNote,
  statusChangeNote,
  statusStyle,
  STATUS_LABEL,
  ticketNumber,
} from '@/lib/labels';
import { getRayfinClient } from '@/lib/rayfin-client';
import { cn } from '@/lib/utils';

// Mirrors @text({ max }) on RequestComment.body.
const COMMENT_MAX = 2000;

export interface RequestDetailProps {
  readonly id: string;
  readonly user: CurrentUser;
  readonly onChanged: (patch: Partial<RequestSummary>) => void;
  readonly onDeleted: (id: string) => void;
  readonly onBack: () => void;
}

export function RequestDetail({ id, user, onChanged, onDeleted, onBack }: RequestDetailProps) {
  const uid = useId();
  const { detail, status, error, reload, patchLocal, addCommentLocal } =
    useRequestDetail(id);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<RequestStatus | null>(null);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkCopied, setLinkCopied] = useState<'idle' | 'copied' | 'failed'>('idle');

  const backButton = (
    <button
      type="button"
      onClick={onBack}
      className="mb-300 inline-flex items-center gap-100 rounded-lg px-200 py-100 text-300 font-medium text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
    >
      <ArrowLeft aria-hidden="true" className="icon-size-200" />
      목록으로
    </button>
  );

  if (status === 'loading' || status === 'idle') {
    return (
      <div>
        {backButton}
        <LoadingState rows={3} />
      </div>
    );
  }

  if (status === 'error' && error) {
    return (
      <div>
        {backButton}
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  if (status === 'missing' || !detail) {
    return (
      <div>
        {backButton}
        <EmptyState
          title="요청을 찾을 수 없습니다"
          hint="삭제되었거나 볼 수 있는 권한이 없는 요청입니다."
        />
      </div>
    );
  }

  async function changeStatus(next: RequestStatus) {
    if (!detail || next === detail.status || pendingStatus) return;
    const previous = detail.status;
    setPendingStatus(next);
    setActionError(null);
    try {
      const client = await getRayfinClient();
      await client.data.DataRequest.update({ id }, { status: next });
      patchLocal({ status: next });
      onChanged({ status: next });
      // Leave a trail of who changed the status and when, as a comment.
      try {
        const note = {
          body: statusChangeNote(previous, next),
          user_id: user.id,
          authorEmail: user.email,
          createdAt: new Date(),
          request_owner_id: detail.user_id,
          request: { id },
        };
        const created = await client.data.RequestComment.create(note);
        addCommentLocal({ ...note, ...created } as RequestCommentRecord);
      } catch (historyError) {
        describeError(historyError, 'save');
        setActionError('상태는 변경했지만 변경 이력을 남기지 못했습니다.');
      }
    } catch (e) {
      setActionError(describeError(e, 'save'));
    } finally {
      setPendingStatus(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied('copied');
    } catch {
      setLinkCopied('failed');
    }
    setTimeout(() => setLinkCopied('idle'), 2000);
  }

  async function postComment(event: React.FormEvent) {
    event.preventDefault();
    const body = comment.trim();
    if (!detail || !body || posting) return;
    setPosting(true);
    setActionError(null);
    try {
      const client = await getRayfinClient();
      const input = {
        body,
        user_id: user.id,
        authorEmail: user.email,
        createdAt: new Date(),
        // Copied so the requester can read comments on their own request.
        request_owner_id: detail.user_id,
        request: { id },
      };
      const created = await client.data.RequestComment.create(input);
      addCommentLocal({ ...input, ...created } as RequestCommentRecord);
      setComment('');
    } catch (e) {
      setActionError(describeError(e, 'save'));
    } finally {
      setPosting(false);
    }
  }

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    setActionError(null);
    try {
      const client = await getRayfinClient();
      await client.data.DataRequest.delete({ id });
      onDeleted(id);
    } catch (e) {
      setActionError(describeError(e, 'delete'));
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {backButton}
      <article
        className={cn(
          'rounded-2xl border border-l-4 border-border bg-card p-500',
          statusStyle(detail.status).rail
        )}
      >
        <header>
          <div className="flex flex-wrap items-center justify-between gap-300">
            <span className="inline-flex items-center gap-200">
              <span className="font-monospace text-200 text-muted-foreground">
                {ticketNumber(detail.id)}
              </span>
              <button
                type="button"
                onClick={() => void copyLink()}
                aria-label="이 요청의 링크 복사"
                className="inline-flex items-center gap-100 rounded-md px-200 py-100 text-200 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Link2 aria-hidden="true" className="icon-size-100" />
                {linkCopied === 'copied'
                  ? '복사됨'
                  : linkCopied === 'failed'
                    ? '복사하지 못함'
                    : '링크 복사'}
              </button>
            </span>
            <div className="flex items-center gap-300">
              <StatusBadge status={detail.status} />
              <UrgencyTag urgency={detail.urgency} />
            </div>
          </div>
          <h2 className="mt-200 text-600 font-semibold text-foreground">
            {displayText(detail.title, '(제목 없음)')}
          </h2>
        </header>

        <dl className="mt-400 grid gap-x-600 gap-y-300 text-300 sm:grid-cols-2">
          <div>
            <dt className="text-200 text-muted-foreground">요청자</dt>
            <dd className="text-foreground">{displayText(detail.requesterEmail)}</dd>
          </div>
          <div>
            <dt className="text-200 text-muted-foreground">등록 일시</dt>
            <dd className="text-foreground">{formatDateTime(detail.createdAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-200 text-muted-foreground">대상 테이블 / 보고서</dt>
            <dd className="font-monospace text-foreground">
              {displayText(detail.targetTable)}
            </dd>
          </div>
        </dl>

        <section aria-label="증상 및 상세 내용" className="mt-400">
          <h3 className="text-200 text-muted-foreground">증상 및 상세 내용</h3>
          <p className="mt-100 whitespace-pre-wrap text-300 leading-400 text-foreground">
            {displayText(detail.symptom, '입력된 내용이 없습니다.')}
          </p>
        </section>

        {user.isStaff ? (
          <section aria-label="처리 상태 변경" className="mt-500">
            <h3 className="mb-200 text-200 text-muted-foreground">처리 상태</h3>
            <div role="group" aria-label="처리 상태" className="flex flex-wrap gap-200">
              {REQUEST_STATUSES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={detail.status === value}
                  disabled={pendingStatus !== null}
                  onClick={() => void changeStatus(value)}
                  className={cn(
                    'rounded-lg border px-300 py-200 text-[length:var(--text-300)] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
                    detail.status === value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-accent'
                  )}
                >
                  {pendingStatus === value ? '변경 중…' : STATUS_LABEL[value]}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </article>

      {actionError ? (
        <div className="mt-400">
          <ErrorState message={actionError} />
        </div>
      ) : null}

      <section aria-label="코멘트" className="mt-600">
        <h3 className="text-400 font-semibold text-foreground">
          코멘트 <span className="font-monospace text-300 text-muted-foreground">{detail.comments.length}</span>
        </h3>

        {detail.comments.length === 0 ? (
          <p className="mt-200 text-300 text-muted-foreground">아직 코멘트가 없습니다.</p>
        ) : (
          <ul className="mt-300 space-y-300">
            {detail.comments.map((c) =>
              isStatusChangeNote(c.body) ? (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-x-200 gap-y-100 px-300 text-200 text-muted-foreground"
                >
                  <History aria-hidden="true" className="icon-size-100 shrink-0" />
                  <span className="font-medium text-foreground">{displayText(c.body)}</span>
                  <span>
                    {displayText(c.authorEmail)} · {formatDateTime(c.createdAt)}
                  </span>
                </li>
              ) : (
              <li key={c.id} className="rounded-xl border border-border bg-card p-300">
                <div className="flex flex-wrap items-baseline justify-between gap-x-300 text-200 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {displayText(c.authorEmail)}
                  </span>
                  <span>{formatDateTime(c.createdAt)}</span>
                </div>
                <p className="mt-100 whitespace-pre-wrap text-300 text-foreground">
                  {displayText(c.body)}
                </p>
              </li>
              )
            )}
          </ul>
        )}

        <form onSubmit={(e) => void postComment(e)} className="mt-400 space-y-200">
          <label htmlFor={`${uid}-comment`} className="block text-300 font-medium text-foreground">
            코멘트 작성
          </label>
          <textarea
            id={`${uid}-comment`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void postComment(e);
            }}
            maxLength={COMMENT_MAX}
            rows={3}
            disabled={posting}
            placeholder="추가 정보나 진행 상황을 남겨 주세요."
            className="block w-full rounded-lg border border-input bg-card px-300 py-200 text-300 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <div className="flex items-center justify-between">
            <span className="text-200 text-muted-foreground">
              {comment.length}/{COMMENT_MAX} · Ctrl+Enter로 등록
            </span>
            <button
              type="submit"
              disabled={posting || comment.trim().length === 0}
              className="rounded-full bg-primary px-400 py-200 text-300 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {posting ? '등록 중…' : '코멘트 등록'}
            </button>
          </div>
        </form>
      </section>

      {user.isStaff ? (
        <section aria-label="삭제" className="mt-600 border-t border-border pt-400">
          {confirmingDelete ? (
            <ConfirmDelete
              label={displayText(detail.title, ticketNumber(detail.id))}
              pending={deleting}
              onCancel={() => setConfirmingDelete(false)}
              onConfirm={() => void remove()}
            />
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex items-center gap-200 rounded-lg px-300 py-200 text-300 font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 aria-hidden="true" className="icon-size-200" />
              요청 삭제
            </button>
          )}
        </section>
      ) : null}
    </div>
  );
}
