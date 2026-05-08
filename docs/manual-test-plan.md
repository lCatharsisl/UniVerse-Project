# Manual Test Plan

This checklist provides repeatable manual validation evidence for Technical Tree `TEST-1`.

## Preconditions

- Backend is running and reachable at the configured API URL.
- Frontend is running and can reach the backend.
- Test users exist for `student`, `staff`, `admin`, and `community` roles.
- Browser dev tools are open with the Network tab enabled.

## Core Flows

| Area | Scenario | Expected Result |
| --- | --- | --- |
| Authentication | Register a student account with valid fields | Account is created and user can log in. |
| Authentication | Login with valid email/password | Session token is stored and protected pages open. |
| Authentication | Login with invalid password | API returns an error and no session is stored. |
| Authentication | Logout | Session token is removed and protected pages redirect to login. |
| Authorization | Open academic reported-content page as student | Access is denied or hidden according to role rules. |
| Authorization | Open academic reported-content page as staff/admin | Page loads reported content controls. |
| Profile | Edit profile fields and avatar | Changes persist after refresh. |
| Social Feed | Create text post | Post appears in feed. |
| Social Feed | Create post with valid image/video | Media is uploaded and rendered. |
| Social Feed | Try unsupported upload type | Upload is rejected with a clear error. |
| Social Feed | Like, comment, repost, and delete own post | Actions update UI and survive refresh where applicable. |
| Community | Join and leave a community | Membership state updates correctly. |
| Community Admin | Community owner edits categories/media | Changes are saved and visible on community profile. |
| Messaging | Start direct conversation | Conversation opens and appears in list. |
| Messaging | Send text and media message | Message appears in thread and unread counts update for recipient. |
| Lost/Found | Create lost item with image | Item appears in lost/found feed with image. |
| Lost/Found | Resolve own item | Item is marked resolved and update is visible. |
| Appointments | Student creates appointment with staff | Appointment appears for both student and staff. |
| Appointments | Staff changes appointment status | Student sees updated status/notification. |
| Search | Search users/posts/communities | Results are relevant and respect private/blocked visibility. |
| Notifications | Trigger social/community/appointment notification | Notification appears in correct scope and can be marked read. |
| Localization | Switch language TR/EN | Labels update and chosen language persists after refresh. |
| Theme | Switch theme/dimension | Theme persists after refresh. |

## Responsive Smoke

| Viewport | Pages | Expected Result |
| --- | --- | --- |
| Mobile 390x844 | Login, Feed, Messages, Profile, Community, Lost/Found | No horizontal scroll; primary actions remain reachable. |
| Tablet 768x1024 | Feed, Campus Map, Appointments, Search | Layout remains usable and navigation is visible. |
| Desktop 1440x900 | Feed, Messages, Community Admin, Settings | Sidebar/content panels render without overlap. |

## Negative Security Checks

| Scenario | Expected Result |
| --- | --- |
| Open protected route without token | Redirect to login or API returns `401`. |
| Use student token for staff/admin-only action | API returns `403`. |
| Edit/delete another user's post or item | API rejects request. |
| Upload unsupported MIME type | API rejects request. |
| Repeat login/search/upload rapidly | Rate limiting is applied where configured. |

## Evidence Capture

For each release candidate, record:

- Date, commit hash, tester name.
- Browser and viewport used.
- Passed/failed scenario IDs.
- Screenshots or network logs for failures.
- Follow-up issue links for unresolved failures.

