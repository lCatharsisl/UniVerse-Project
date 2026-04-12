import { Router } from 'express';
import { authenticateSession } from '../../../../middleware/auth';
import { upload } from '../../../../middleware/upload';
import { MessagingController } from './messaging.controller';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true, service: 'messaging' }));
router.get('/users/search', authenticateSession, MessagingController.searchUsers);

router.get('/conversations', authenticateSession, MessagingController.listConversations);
router.post('/conversations', authenticateSession, MessagingController.createConversation);
router.post('/conversations/:id/participants', authenticateSession, MessagingController.addParticipants);
router.post('/conversations/:id/leave', authenticateSession, MessagingController.leaveConversation);
router.delete('/conversations/:id', authenticateSession, MessagingController.deleteConversation);

router.get('/conversations/:id/messages', authenticateSession, MessagingController.getMessages);
router.delete('/conversations/:id/messages/:messageId', authenticateSession, MessagingController.unsendMessage);
router.post(
  '/conversations/:id/messages',
  authenticateSession,
  upload.array('images', 5),
  MessagingController.sendMessage
);
router.post('/conversations/:id/read', authenticateSession, MessagingController.markRead);

export { router as messagingRouter };
