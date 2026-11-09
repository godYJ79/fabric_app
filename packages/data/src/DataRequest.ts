import {
  authenticated,
  date,
  entity,
  many,
  set,
  text,
  uuid,
} from '@microsoft/rayfin-core';
import { STAFF_EMAILS } from '@rayfin-app/shared';
import { RequestComment } from './RequestComment.js';

/**
 * A data issue or request raised by a business user.
 *
 * Access (enforced by the data service, not the UI):
 * - anyone signed in can create a request, but only as themselves (`user_id` must be their own id);
 * - a requester reads only their own requests; staff (see `STAFF_EMAILS`) read all of them;
 * - only staff can update (for example change `status`) or delete.
 *
 * `user_id` is not filled in by the service: the client must set it to the
 * signed-in user's id (`session.user.id`) when it creates a request.
 */
@entity()
@authenticated('create', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
@authenticated('read', {
  policy: (claims, item) =>
    STAFF_EMAILS.map((email) => claims.email.eq(email)).reduce((a, b) => a.or(b)).or(claims.sub.eq(item.user_id)),
})
@authenticated('update', {
  policy: (claims) => STAFF_EMAILS.map((email) => claims.email.eq(email)).reduce((a, b) => a.or(b)),
})
@authenticated('delete', {
  policy: (claims) => STAFF_EMAILS.map((email) => claims.email.eq(email)).reduce((a, b) => a.or(b)),
})
export class DataRequest {
  @uuid() id!: string;
  @text({ min: 1, max: 100 }) title!: string;
  @text({ optional: true, max: 2000 }) symptom?: string;
  @text({ max: 200 }) targetTable!: string;
  @set('low', 'normal', 'urgent') urgency!: 'low' | 'normal' | 'urgent';
  @set('received', 'analyzing', 'done') status!: 'received' | 'analyzing' | 'done';
  @text({ max: 200 }) user_id!: string;
  @text({ max: 254 }) requesterEmail!: string;
  @date() createdAt!: Date;
  @many(() => RequestComment) comments?: RequestComment[];
}
