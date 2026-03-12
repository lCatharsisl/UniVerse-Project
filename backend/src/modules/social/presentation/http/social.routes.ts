import { Router } from 'express';
import { SocialController } from './social.controller';
import { authenticateSession } from '../../../../middleware/auth';
import { upload } from '../../../../middleware/upload';

const router = Router();

// Existing comments routes
router.post('/comments', authenticateSession, SocialController.addComment);
router.get('/comments/:itemType/:itemId', authenticateSession, SocialController.getComments);

// Feed & Posts
router.post('/posts', authenticateSession, upload.array('images', 1), SocialController.createPost);
router.get('/posts', authenticateSession, SocialController.getFeed);
router.delete('/posts/:id', authenticateSession, SocialController.deletePost);

// Interactions
router.post('/posts/:id/like', authenticateSession, SocialController.toggleLike);
router.get('/posts/:id/likes', authenticateSession, SocialController.getPostLikes);
router.post('/posts/:id/repost', authenticateSession, SocialController.toggleRepost);

// Post Comments
router.post('/posts/:id/comments', authenticateSession, SocialController.addPostComment);
router.get('/posts/:id/comments', authenticateSession, SocialController.getPostComments);

// User Profile Activities & Stats
router.get('/users/:id/activities/:type', authenticateSession, SocialController.getUserActivities);
router.post('/users/:id/follow', authenticateSession, SocialController.toggleFollow);
router.get('/users/:id/stats', authenticateSession, SocialController.getFollowStats);
router.get('/users/:id/followers', authenticateSession, SocialController.getFollowers);
router.get('/users/:id/following', authenticateSession, SocialController.getFollowing);

export { router as socialRouter };
