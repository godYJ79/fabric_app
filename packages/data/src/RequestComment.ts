import {
  authenticated,
  date,
  entity,
  one,
  text,
  uuid,
} from '@microsoft/rayfin-core';
import { STAFF_EMAILS } from '@rayfin-app/shared';
import { DataRequest } from './DataRequest.js';

/**
 * A comment on a request.
 *
 * `request_owner_id` copies the parent request's `user_id` when the comment is
 * created, because a policy can only look at the row it guards. That lets a
 * requester read the comments on their own request. The service does not check
 * that the copied value is truthful, so a malicious signed-in user could attach
 * a comment to another person's request; this is acceptable for an internal
 * tracker but worth revisiting before wider use.
 */
@entity()
@authenticated('create', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
@authenticated('read', {
  policy: (claims, item) =>
    STAFF_EMAILS.map((email) => claims.email.eq(email))
      .reduce((a, b) => a.or(b))
      .or(claims.sub.eq(item.request_owner_id))
      .or(claims.sub.eq(item.user_id)),
})
@authenticated('delete', {
  policy: (claims, item) =>
    STAFF_EMAILS.map((email) => claims.email.eq(email)).reduce((a, b) => a.or(b)).or(claims.sub.eq(item.user_id)),
})
export class RequestComment {
  @uuid() id!: string;
  @text({ min: 1, max: 2000 }) body!: string;
  @text({ max: 200 }) user_id!: string;
  @text({ max: 254 }) authorEmail!: string;
  @date() createdAt!: Date;
  @text({ max: 200 }) request_owner_id!: string;
  @one(() => DataRequest) request!: DataRequest;
}
