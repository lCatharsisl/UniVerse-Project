import { Router } from 'express';
import { z } from 'zod';
import { authenticateSession } from '../../../../middleware/auth';
import { validateParams, validateQuery, validateRequest } from '../../../../middleware/validateRequest';
import { NotificationsController } from './notifications.controller';

const router = Router();
router.use(authenticateSession);

/** Static paths must be registered before `GET /` so they are not swallowed. */
router.get('/unread-count', NotificationsController.unreadCount);

router.get('/preferences', NotificationsController.getPreferences);

router.put(
  '/preferences',
  validateRequest(
    z.object({
      prefs: z.record(z.boolean()).default({}),
    })
  ),
  NotificationsController.updatePreferences
);

router.get(
  '/',
  validateQuery(
    z.object({
      limit: z.string().optional(),
      offset: z.string().optional(),
    })
  ),
  NotificationsController.list
);

router.post(
  '/:id/read',
  validateParams(z.object({ id: z.string() })),
  NotificationsController.markRead
);

router.post('/read-all', NotificationsController.readAll);

router.post(
  '/read-tab',
  validateRequest(
    z.object({
      scope: z.enum(['personal', 'academic', 'community']),
    })
  ),
  NotificationsController.readTab
);

router.delete(
  '/',
  validateRequest(
    z.object({
      ids: z.array(z.number().int()).optional(),
      before: z.string().datetime().optional(),
    })
  ),
  NotificationsController.bulkDelete
);

export { router as notificationsRouter };
