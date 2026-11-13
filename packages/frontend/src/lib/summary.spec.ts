import { describe, expect, it } from 'vitest';

import { summarize } from './summary';

describe('summarize', () => {
  it('counts by status and finds urgent work that is still open', () => {
    const counts = summarize([
      { status: 'received', urgency: 'urgent' },
      { status: 'analyzing', urgency: 'urgent' },
      { status: 'analyzing', urgency: 'normal' },
      { status: 'done', urgency: 'urgent' },
      { status: 'done', urgency: 'low' },
    ]);
    expect(counts).toEqual({ total: 5, received: 1, analyzing: 2, done: 2, urgentOpen: 2 });
  });

  it('counts unknown statuses toward the total only', () => {
    expect(summarize([{ status: 'weird', urgency: null }]).total).toBe(1);
    expect(summarize([])).toEqual({ total: 0, received: 0, analyzing: 0, done: 0, urgentOpen: 0 });
  });
});
