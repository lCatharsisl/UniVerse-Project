import { Router } from 'express';
import { SocialController } from './social.controller';
import { authenticateSession } from '../../../../middleware/auth';
import { uploadSocialPost } from '../../../../middleware/upload';

const router = Router();

// Health check (no auth) - open /api/social/health to verify proxy + backend
router.get('/health', (_req, res) => res.json({ ok: true, service: 'social' }));

// Report routes first (exact path match to avoid 404)
router.post('/posts/:id/report', authenticateSession, SocialController.reportPost);
router.delete('/posts/:id/report', authenticateSession, SocialController.removeReportPost);
router.post('/users/:id/report', authenticateSession, SocialController.reportUser);
router.delete('/users/:id/report', authenticateSession, SocialController.removeReportUser);
router.get('/users/:id/my-report', authenticateSession, SocialController.getMyUserReport);

// Existing comments routes
router.post('/comments', authenticateSession, SocialController.addComment);
router.get('/comments/:itemType/:itemId', authenticateSession, SocialController.getComments);

// Feed & Posts
router.post('/posts', authenticateSession, uploadSocialPost.array('images', 1), SocialController.createPost);
router.get('/feed', authenticateSession, SocialController.getFeed);
router.get('/discover', authenticateSession, SocialController.getDiscover);
router.get('/posts', authenticateSession, SocialController.getFeed);
router.get('/posts/:id', authenticateSession, SocialController.getPost);
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

// Reported content & reporters (academic only)
router.get('/reported/posts', authenticateSession, SocialController.getReportedPosts);
router.get('/reported/users', authenticateSession, SocialController.getReportedUsers);
router.get('/posts/:id/reporters', authenticateSession, SocialController.getPostReporters);
router.get('/users/:id/reporters', authenticateSession, SocialController.getUserReporters);
router.get('/posts/:id/report-count', authenticateSession, SocialController.getPostReportCount);

// Warnings (academic only)
router.post('/users/:id/warning', authenticateSession, SocialController.addWarning);
router.patch('/users/:id/warning', authenticateSession, SocialController.updateUserWarning);

export { router as socialRouter };
