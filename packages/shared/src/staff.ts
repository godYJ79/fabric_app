/**
 * Who counts as support staff for the request tracker.
 *
 * Fabric Apps only supports the built-in `authenticated` and `anonymous` roles,
 * and no documented mechanism puts a per-user role into `claims.role`. Staff are
 * therefore identified by e-mail address, and the data policies compare the
 * signed-in user's `claims.email` against this list on the server.
 *
 * Changing this list changes the policies: redeploy with `npx rayfin up` (or
 * `npx rayfin up db apply`) afterwards. The UI uses the same list only to decide
 * which controls to show; the server enforces access either way.
 *
 * Keep addresses in lower case. Whether the identity provider's e-mail claim is
 * lower case has not been verified yet.
 */
export const STAFF_EMAILS: readonly string[] = ['yjshin@in4ucloud.com'];

export function isStaffEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return STAFF_EMAILS.some((staff) => staff === normalized);
}
