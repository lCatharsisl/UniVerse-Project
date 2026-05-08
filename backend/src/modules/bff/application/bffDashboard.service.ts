import { MessagingService } from '../../messaging/infrastructure/messaging.service';
import { NotificationsService } from '../../notifications/infrastructure/notifications.service';

/** Backend-for-Frontend: tek çağrıda shell verileri (dashboard / mobil home). */
export class BffDashboardService {
  static async getDashboardShell(userId: number) {
    const [notifications, messagingUnread] = await Promise.all([
      NotificationsService.getUnreadCount(userId),
      MessagingService.getUnreadCount(userId),
    ]);

    return {
      schemaVersion: 1,
      notifications,
      messagingUnread,
      generatedAt: new Date().toISOString(),
    };
  }
}
