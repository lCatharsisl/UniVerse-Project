import { Router } from 'express';
import { authenticateSession } from '../../../../middleware/auth';
import { cvUpload } from '../../../../middleware/cvUpload';
import { upload } from '../../../../middleware/upload';
import { CommunityController } from './community.controller';

const router = Router();
router.use(authenticateSession);

// ─────────────────────────────────────────────────────────────────────────────
// Fair / Discovery
// ─────────────────────────────────────────────────────────────────────────────
router.get('/fair', CommunityController.getFairCommunities);

// ─────────────────────────────────────────────────────────────────────────────
// My communities (profile shortcut)
// (Declared early to avoid collision with '/:communityId')
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', CommunityController.getMyCommunities);

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// (MUST be declared before '/:communityId' to avoid route collision)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/notifications', CommunityController.getMyNotifications);
router.patch('/notifications/:notificationId/read', CommunityController.markNotificationRead);

// ─────────────────────────────────────────────────────────────────────────────
// Job board (global)
// (MUST be declared before '/:communityId' to avoid route collision)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/jobs/board', CommunityController.getJobBoardPosts);
router.post('/jobs/board', CommunityController.createJobBoardPost);
router.patch('/jobs/board/:jobPostId', CommunityController.updateJobBoardPost);
router.delete('/jobs/board/:jobPostId', CommunityController.deleteJobBoardPost);
router.get('/jobs/board/applications/pending', CommunityController.getPendingJobApplications);

// ─────────────────────────────────────────────────────────────────────────────
// Community profile + membership
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:communityId(\\d+)', CommunityController.getCommunityProfile);
router.post('/:communityId(\\d+)/members', CommunityController.joinCommunity);
router.delete('/:communityId(\\d+)/members/me', CommunityController.leaveCommunity);
router.get('/:communityId(\\d+)/members/me', CommunityController.getMyMembership);
router.get('/:communityId(\\d+)/members', CommunityController.getCommunityMembers);

// Categories management (admin only)
router.patch('/:communityId(\\d+)/categories', CommunityController.updateCommunityCategories);
router.patch(
  '/:communityId(\\d+)/media',
  upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  CommunityController.updateCommunityMedia
);

// ─────────────────────────────────────────────────────────────────────────────
// Events (announcement + application)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:communityId(\\d+)/events', CommunityController.getCommunityEvents);
router.post('/:communityId(\\d+)/events', CommunityController.createCommunityEvent);
router.post('/events/:eventId/applications/init', CommunityController.initEventApplication);
router.get('/events/applications/:eventApplicationId', CommunityController.getEventApplicationDetails);
router.patch(
  '/events/applications/:eventApplicationId',
  cvUpload.single('cv'),
  CommunityController.submitEventApplication
);
router.patch('/events/applications/:eventApplicationId/cancel', CommunityController.cancelEventApplication);
router.patch(
  '/events/applications/:eventApplicationId/decision',
  CommunityController.decideEventApplication
);

// ─────────────────────────────────────────────────────────────────────────────
// Job / Internship posts (announcement + application)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:communityId(\\d+)/jobs', CommunityController.getCommunityJobPosts);
router.post('/:communityId(\\d+)/jobs', CommunityController.createCommunityJobPost);
router.post('/jobs/:jobPostId/applications/init', CommunityController.initJobApplication);
router.get('/jobs/applications/:jobApplicationId', CommunityController.getJobApplicationDetails);
router.patch(
  '/jobs/applications/:jobApplicationId',
  cvUpload.single('cv'),
  CommunityController.submitJobApplication
);
router.patch('/jobs/applications/:jobApplicationId/cancel', CommunityController.cancelJobApplication);
router.patch(
  '/jobs/applications/:jobApplicationId/decision',
  CommunityController.decideJobApplication
);

// ─────────────────────────────────────────────────────────────────────────────
// Admin panel data
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:communityId(\\d+)/admin/event-applications/pending', CommunityController.getPendingEventApplications);
router.get('/:communityId(\\d+)/admin/members/pending', CommunityController.getPendingCommunityMemberRequests);
router.patch(
  '/:communityId(\\d+)/admin/members/:memberUserId/decision',
  CommunityController.decideCommunityMemberRequest
);

// ─────────────────────────────────────────────────────────────────────────────
export { router as communityRouter };

