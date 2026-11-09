import { isStaffEmail } from '@rayfin-app/shared';

import { useAuth } from '@/hooks/auth.context';

export interface CurrentUser {
  /** The signed-in user's id; the data policies compare it with `claims.sub`. */
  id: string;
  email: string;
  /** Matches the staff list the data policies use. The server enforces access either way. */
  isStaff: boolean;
}

/** The signed-in user, or `null` when the session has no user. */
export function useCurrentUser(): CurrentUser | null {
  const { session } = useAuth();
  const user = session?.user;
  if (!user?.id) return null;
  return { id: user.id, email: user.email ?? '', isStaff: isStaffEmail(user.email) };
}
