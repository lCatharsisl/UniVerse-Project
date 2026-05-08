import { Router } from 'express';
import { IdentityController } from './identity.controller';
import { uploadProfileImages } from '../../../../middleware/upload';
import { authenticateSession } from '../../../../middleware/auth';

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────
router.get('/providers', IdentityController.getProviders);
router.post('/register', IdentityController.register);
router.post('/login', IdentityController.login);
router.get('/microsoft/start', IdentityController.beginMicrosoftLogin);
router.get('/microsoft/callback', IdentityController.handleMicrosoftCallback);
router.post('/logout', authenticateSession, IdentityController.logout);

// ─── Current User ─────────────────────────────────────────────────────────────
router.get('/me', authenticateSession, IdentityController.getMe);

// ─── Profile ──────────────────────────────────────────────────────────────────
router.patch(
  '/profile',
  authenticateSession,
  uploadProfileImages.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  IdentityController.updateProfile
);
// getPublicProfile now requires auth so requesterId is available for blocking/privacy checks
router.get('/profile/:id', authenticateSession, IdentityController.getPublicProfile);

// ─── Privacy Settings ─────────────────────────────────────────────────────────
router.patch('/privacy', authenticateSession, IdentityController.updatePrivacy);

// ─── Block / Unblock ─────────────────────────────────────────────────────────
router.post('/block/:id', authenticateSession, IdentityController.toggleBlock);
router.get('/block/:id', authenticateSession, IdentityController.isBlocked);

// ─── Active Sessions ─────────────────────────────────────────────────────────
router.get('/sessions', authenticateSession, IdentityController.getSessions);
router.delete('/sessions/:sessionId', authenticateSession, IdentityController.terminateSession);

// ─── Account Management ───────────────────────────────────────────────────────
router.delete('/account', authenticateSession, IdentityController.deactivateAccount);

export { router as identityRouter };
