import type { TFunction } from 'i18next';

export type NotificationLike = {
  source_module?: string;
  kind?: string;
  title?: string | null;
  message?: string | null;
  actor_name?: string | null;
  actor_surname?: string | null;
  actor_email?: string | null;
  actor_avatar_url?: string | null;
};

function humanizeKind(kind?: string | null) {
  const value = String(kind || '').trim();
  if (!value) return '';
  const tail = value.includes('.') ? value.split('.').pop() || value : value;
  return tail
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function getNotificationActorName(notification: NotificationLike) {
  const actorName = [notification.actor_name, notification.actor_surname].filter(Boolean).join(' ').trim();
  return actorName || notification.actor_email || '';
}

export function getNotificationActorInitials(notification: NotificationLike) {
  const name = getNotificationActorName(notification);
  if (!name) return 'U';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function getNotificationSourceLabel(notification: NotificationLike, t: TFunction) {
  const source = String(notification.source_module || '').toLowerCase();
  switch (source) {
    case 'messaging':
      return t('notifications.sources.messaging');
    case 'community':
      return t('notifications.sources.community');
    case 'academic':
      return t('notifications.sources.academic');
    case 'social':
      return t('notifications.sources.social');
    case 'system':
      return t('notifications.sources.system');
    default:
      return t('notifications.sources.default');
  }
}

export function getNotificationSummary(notification: NotificationLike, t: TFunction) {
  const source = String(notification.source_module || '').toLowerCase();
  const kind = String(notification.kind || '').toLowerCase();
  const actor = getNotificationActorName(notification);
  const title = String(notification.title || '').trim();
  const message = String(notification.message || '').trim();
  const kindSuffix = kind.includes('.') ? kind.split('.').pop() || '' : kind;

  if (source === 'messaging') {
    return actor
      ? t('notifications.summary.messaging.message', { actor })
      : t('notifications.summary.messaging.default');
  }

  if (source === 'social') {
    switch (kindSuffix) {
      case 'like':
        return actor
          ? t('notifications.summary.social.like', { actor })
          : t('notifications.summary.social.likeAnonymous');
      case 'comment':
        return actor
          ? t('notifications.summary.social.comment', { actor })
          : t('notifications.summary.social.commentAnonymous');
      case 'follow':
        return actor
          ? t('notifications.summary.social.follow', { actor })
          : t('notifications.summary.social.followAnonymous');
      case 'repost':
        return actor
          ? t('notifications.summary.social.repost', { actor })
          : t('notifications.summary.social.repostAnonymous');
      default:
        break;
    }
  }

  if (source === 'community') {
    return title || message || t('notifications.summary.community.default');
  }

  if (source === 'academic') {
    return title || message || t('notifications.summary.academic.default');
  }

  if (source === 'system') {
    return title || message || t('notifications.summary.system.default');
  }

  return title || message || humanizeKind(kind) || t('notifications.summary.default');
}

export function formatNotificationTime(value?: string | null, t?: TFunction) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const translate = t || ((key: string, opts?: Record<string, unknown>) => {
    if (key === 'notifications.justNow') return 'just now';
    if (key === 'notifications.minutesAgo') return `${opts?.count}m ago`;
    if (key === 'notifications.hoursAgo') return `${opts?.count}h ago`;
    if (key === 'notifications.daysAgo') return `${opts?.count}d ago`;
    return '';
  });

  if (diffMinutes < 1) return translate('notifications.justNow');
  if (diffMinutes < 60) return translate('notifications.minutesAgo', { count: diffMinutes });
  if (diffHours < 24) return translate('notifications.hoursAgo', { count: diffHours });
  if (diffDays < 7) return translate('notifications.daysAgo', { count: diffDays });

  return date.toLocaleString();
}
