import { STAFF_EMAILS } from '@rayfin-app/shared';

type Comparable<E> = { eq(value: string): E };

/**
 * Policy expression that is true when the signed-in user's e-mail is on the staff list.
 * Staff are identified by e-mail because only the built-in `authenticated` role exists.
 */
export function staffOnly<E extends { or(other: E): E }>(claims: { email: Comparable<E> }): E {
  return STAFF_EMAILS.map((email) => claims.email.eq(email)).reduce((a, b) => a.or(b));
}
