import { resolveMediaUrl } from './resolveMediaUrl';

/** Shape returned by GET /auth/me */
export type AuthMeUser = {
  profileImageUrl?: string;
  profile?: {
    student_name?: string;
    student_surname?: string;
    staff_name?: string;
    staff_surname?: string;
    community_name?: string;
  };
  email?: string;
};

export function getAuthUserAvatarUrl(user: AuthMeUser | null | undefined): string {
  if (!user?.profileImageUrl) return '';
  return resolveMediaUrl(user.profileImageUrl);
}

/** Initials from name fields; never use numeric student-ID prefix from email. */
export function getAuthUserInitials(user: AuthMeUser | null | undefined): string {
  if (!user) return '?';
  const p = user.profile;
  const first = String(p?.student_name || p?.staff_name || p?.community_name || '').trim();
  const last = String(p?.student_surname || p?.staff_surname || '').trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) {
    const words = first.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return first[0].toUpperCase();
  }
  const local = user.email?.split('@')[0] || '';
  const letter = local.match(/\p{L}/u);
  if (letter) return letter[0].toUpperCase();
  return '?';
}
