# AK-63 – Done Items

- GitHub Actions CI pipeline added with backend (lint, build, Vitest) and frontend jobs triggered on push/PR to `main`.
- Messaging module scaffolded: `conversations`, `participants`, `messages` tables (migration `013`), `Messages.tsx` page, and global `MessagingUnreadContext`.
- Unified notifications system added (migration `014`, single `notifications` table). `NotificationEmitterService` wired into `SocialService` for like/repost events. `Notifications.tsx` and `NavIconBadge` added.
- Microsoft / Azure AD OAuth2 login integrated for staff via `@azure/msal-node`; auto-links or provisions accounts from ID token claims.
- Staff email candidate-matching utility added to prevent duplicate registrations by comparing all name-based email variants against existing staff records.
- Community module added: backend scaffold with migrations `010–012` and five new frontend pages (Fair, Profile, Admin Panel, My Space, Notifications).
- Appointments module added: recurring slot and date-override migrations, `Appointments.tsx` booking page.
- Job Board, Job/Event Application Forms, and Discover Feed added as new frontend pages.
- All `App.tsx` page imports migrated to `React.lazy()` + `Suspense` for route-level code splitting.
- Sidebar, BottomNav, and RightSidebar updated with new routes and unread badges. ~470 new i18n keys added.
