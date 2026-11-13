export interface StatusCounts {
  total: number;
  received: number;
  analyzing: number;
  done: number;
  /** Urgent requests that are not finished. */
  urgentOpen: number;
}

export const EMPTY_COUNTS: StatusCounts = {
  total: 0,
  received: 0,
  analyzing: 0,
  done: 0,
  urgentOpen: 0,
};

/** Counts rows by status. Unknown statuses count toward the total only. */
export function summarize(
  rows: readonly { status: unknown; urgency: unknown }[]
): StatusCounts {
  const counts = { ...EMPTY_COUNTS };
  for (const row of rows) {
    counts.total += 1;
    if (row.status === 'received') counts.received += 1;
    else if (row.status === 'analyzing') counts.analyzing += 1;
    else if (row.status === 'done') counts.done += 1;
    if (row.urgency === 'urgent' && row.status !== 'done') counts.urgentOpen += 1;
  }
  return counts;
}
