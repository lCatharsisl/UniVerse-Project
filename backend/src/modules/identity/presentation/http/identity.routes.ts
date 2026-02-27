import { Router } from 'express';
import { IdentityController } from './identity.controller';
import { upload } from '../../../../middleware/upload';

const router = Router();

router.post('/register', IdentityController.register);
router.post('/login', IdentityController.login);
router.post('/logout', IdentityController.auth, IdentityController.logout);
router.get('/me', IdentityController.auth, IdentityController.getMe);
router.patch('/profile', IdentityController.auth, IdentityController.updateProfile);
router.post('/profile/avatar', IdentityController.auth, upload.single('avatar'), IdentityController.uploadAvatar);
router.get('/profile/:id', IdentityController.getPublicProfile);

export { router as identityRouter };
