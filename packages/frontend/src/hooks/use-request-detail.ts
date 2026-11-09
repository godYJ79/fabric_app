import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataRequestRecord, RequestCommentRecord } from '@rayfin-app/shared';

import { describeError } from '@/lib/errors';
import { getRayfinClient } from '@/lib/rayfin-client';

export type RequestDetail = Omit<DataRequestRecord, 'comments'> & {
  comments: RequestCommentRecord[];
};

function time(value: unknown): number {
  const date =
    value instanceof Date ? value : new Date(value as string | number);
  const ms = date.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export type DetailStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

export interface UseRequestDetailResult {
  detail: RequestDetail | null;
  status: DetailStatus;
  error: string | null;
  reload(): void;
  patchLocal(patch: Partial<RequestDetail>): void;
  addCommentLocal(comment: RequestCommentRecord): void;
}

/**
 * One request with its comments, oldest comment first.
 * `missing` means no row came back: it does not exist, or the signed-in user
 * is not allowed to read it (the data service does not say which).
 */
export function useRequestDetail(id: string | null): UseRequestDetailResult {
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [status, setStatus] = useState<DetailStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const mine = ++generation.current;
    if (!id) {
      setDetail(null);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const client = await getRayfinClient();
      const rows = await client.data.DataRequest.select([
        'id',
        'title',
        'symptom',
        'targetTable',
        'urgency',
        'status',
        'user_id',
        'requesterEmail',
        'createdAt',
        'comments.id',
        'comments.body',
        'comments.user_id',
        'comments.authorEmail',
        'comments.createdAt',
        'comments.request_owner_id',
      ])
        .where({ id: { eq: id } })
        .first(1)
        .execute();
      if (mine !== generation.current) return;
      const row = rows[0];
      if (!row) {
        setDetail(null);
        setStatus('missing');
        return;
      }
      const comments = [...(row.comments ?? [])].sort(
        (a, b) => time(a.createdAt) - time(b.createdAt)
      );
      setDetail({ ...row, comments } as RequestDetail);
      setStatus('ready');
    } catch (e) {
      if (mine !== generation.current) return;
      setError(describeError(e, 'load'));
      setStatus('error');
    }
  }, [id]);

  useEffect(() => {
    // Fetch when the selected request changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return {
    detail,
    status,
    error,
    reload: () => void load(),
    patchLocal: (patch) =>
      setDetail((prev) => (prev ? { ...prev, ...patch } : prev)),
    addCommentLocal: (comment) =>
      setDetail((prev) =>
        prev ? { ...prev, comments: [...prev.comments, comment] } : prev
      ),
  };
}
