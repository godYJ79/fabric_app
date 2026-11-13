import { useEffect, useState } from 'react';

import { describeError } from '@/lib/errors';
import { fetchStatusRows } from '@/lib/request-queries';
import { summarize, type StatusCounts } from '@/lib/summary';

/** Read at most this many rows for the counts; beyond it the numbers are shown as a floor. */
const SUMMARY_CAP = 5000;

export interface UseSummaryResult {
  counts: StatusCounts | null;
  /** True when more requests exist than were counted. */
  truncated: boolean;
  failed: boolean;
}

/**
 * Counts of the requests the signed-in user can read, by status.
 * Recounted whenever `version` changes (after a create, status change or delete).
 * The data client has no count operation, so rows are read and counted here.
 */
export function useSummary(version: number): UseSummaryResult {
  const [counts, setCounts] = useState<StatusCounts | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchStatusRows(SUMMARY_CAP);
        if (cancelled) return;
        setCounts(summarize(result.items));
        setTruncated(result.truncated);
        setFailed(false);
      } catch (e) {
        describeError(e, 'load');
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { counts, truncated, failed };
}
