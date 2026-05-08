import { Response } from 'express';
import { storePublicUpload } from '../../../../integrations/mediaObjectStorage';
import { AuthenticatedRequest } from '../../../../middleware/auth';
import { requireAdmin, requireIntParam, requireUser } from '../../../../middleware/policy';
import { storeCommunityImage } from '../../../../integrations/profileStorage';
import { CommunityService } from '../../infrastructure/community.service';
import { AppError } from '../../../../shared/core/errors';

export class CommunityController {
  private static async respond<T>(
    res: Response,
    fn: () => Promise<T>,
    statusCode: number = 200
  ): Promise<Response> {
    try {
      const data = await fn();
      return res.status(statusCode).json(data);
    } catch (error: any) {
      const status = error instanceof AppError ? error.statusCode : error?.statusCode || 400;
      const message = error instanceof AppError ? error.message : error?.message || 'Request failed';
      return res.status(status).json({ error: message });
    }
  }

  static async getFairCommunities(req: AuthenticatedRequest, res: Response) {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const userId = requireUser(req);
    return CommunityController.respond(res, () => CommunityService.getFairCommunities(userId, category));
  }

  static async getMyCommunities(req: AuthenticatedRequest, res: Response) {
    const safeUserId = Number(requireUser(req));
    if (!Number.isFinite(safeUserId) || Number.isNaN(safeUserId)) {
      console.error('[community] getMyCommunities invalid session user id:', req.userId, 'safeUserId=', safeUserId);
      return res.status(400).json({ error: 'Invalid session user id' });
    }
    return CommunityController.respond(res, () => CommunityService.getMyCommunities(safeUserId));
  }

  static async getCommunityProfile(req: AuthenticatedRequest, res: Response) {
    // Defensive route-collision guard:
    // if some runtime/ordering issue causes `/me` to be treated like `/:communityId`,
    // we still return the correct "my communities" payload instead of a SQL NaN error.
    const rawCommunityId = String(req.params.communityId || '');
    if (rawCommunityId === 'me') {
      console.error('[community] getCommunityProfile rawCommunityId=me, userId=', req.userId);
      return CommunityController.getMyCommunities(req, res);
    }

    const communityId = parseInt(rawCommunityId, 10);
    if (Number.isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community id' });
    }

    const userId = requireUser(req);
    return CommunityController.respond(res, () => CommunityService.getCommunityProfile(communityId, userId));
  }

  static async joinCommunity(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const communityId = requireIntParam(req, 'communityId');
    return CommunityController.respond(res, () => CommunityService.joinCommunity(communityId, userId));
  }

  static async leaveCommunity(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const communityId = requireIntParam(req, 'communityId');
    return CommunityController.respond(res, () => CommunityService.leaveCommunity(communityId, userId));
  }

  static async getMyMembership(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const communityId = requireIntParam(req, 'communityId');
    return CommunityController.respond(res, () => CommunityService.getMyMembership(communityId, userId));
  }

  static async getCommunityMembers(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    return CommunityController.respond(res, () => CommunityService.getCommunityMembers(communityId));
  }

  static async updateCommunityCategories(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const communityId = requireIntParam(req, 'communityId');
    const categories = Array.isArray(req.body?.categories) ? req.body.categories.map((c: any) => String(c)) : [];
    return CommunityController.respond(res, () => CommunityService.updateCommunityCategories(communityId, userId, categories));
  }

  static async updateCommunityMedia(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const communityId = requireIntParam(req, 'communityId');
    const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const avatar = files?.avatar?.[0];
    const cover = files?.cover?.[0];

    if (!avatar && !cover) {
      return res.status(400).json({ error: 'No media file provided' });
    }

    return CommunityController.respond(res, async () => {
      const avatarUrl = avatar ? await storeCommunityImage(avatar, 'avatar', communityId) : undefined;
      const coverUrl = cover ? await storeCommunityImage(cover, 'cover', communityId) : undefined;
      return CommunityService.updateCommunityMedia(communityId, userId, {
        avatarUrl,
        coverUrl,
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Events
  // ─────────────────────────────────────────────────────────────────────────────
  static async getCommunityEvents(req: AuthenticatedRequest, res: Response) {
    const communityId = requireIntParam(req, 'communityId');
    return CommunityController.respond(res, () => CommunityService.getCommunityEvents(communityId));
  }

  static async getTodaysCampusEvents(req: AuthenticatedRequest, res: Response) {
    requireUser(req);
    return CommunityController.respond(res, () => CommunityService.getTodaysCampusEvents());
  }

  static async deleteCampusEventByAdmin(req: AuthenticatedRequest, res: Response) {
    requireAdmin(req);
    const userId = requireUser(req);
    const eventId = requireIntParam(req, 'eventId');
    return CommunityController.respond(res, () => CommunityService.deactivateCampusEventByPlatformAdmin(eventId, userId));
  }

  /** Publisher (`created_by_user_id`) or platform admin may soft-delete the event. */
  static async deleteCommunityEvent(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const communityId = requireIntParam(req, 'communityId');
    const eventId = requireIntParam(req, 'eventId');
    const isPlatformAdmin = String(req.userRole || '') === 'admin';
    return CommunityController.respond(res, () =>
      CommunityService.deactivateCommunityEventForUser(eventId, userId, { isPlatformAdmin, communityId })
    );
  }

  static async createCommunityEvent(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const communityId = requireIntParam(req, 'communityId');
    const body = (req.body || {}) as Record<string, unknown>;
    const pickStr = (v: unknown): string | undefined => {
      if (typeof v === 'string') return v;
      if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
      return undefined;
    };
    const title = pickStr(body.title);
    const description = pickStr(body.description);
    const location = pickStr(body.location);
    const start_at = pickStr(body.start_at);
    const end_at = pickStr(body.end_at);
    return CommunityController.respond(
      res,
      () =>
        CommunityService.createCommunityEvent(communityId, userId, {
          title: String(title || '').trim(),
          description: description ?? null,
          location: location ?? null,
          startAt: start_at ? new Date(start_at) : null,
          endAt: end_at ? new Date(end_at) : null,
        }),
      201
    );
  }

  static async uploadCommunityEventPoster(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const communityId = requireIntParam(req, 'communityId');
    const eventId = requireIntParam(req, 'eventId');
    const posterFile = (req as { file?: Express.Multer.File }).file;
    if (!posterFile) return res.status(400).json({ error: 'Poster file is required' });
    return CommunityController.respond(res, () => CommunityService.setCommunityEventPoster(communityId, eventId, userId, posterFile));
  }

  static async initEventApplication(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const eventId = requireIntParam(req, 'eventId');
    return CommunityController.respond(
      res,
      () => CommunityService.initEventApplication(eventId, userId),
      201
    );
  }

  static async getEventApplicationDetails(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const eventApplicationId = requireIntParam(req, 'eventApplicationId');
    return CommunityController.respond(res, () => CommunityService.getEventApplicationDetails(eventApplicationId, userId));
  }

  static async submitEventApplication(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const eventApplicationId = requireIntParam(req, 'eventApplicationId');
    const phone_number = typeof req.body.phone_number === 'string' ? req.body.phone_number : null;
    const cover_letter = typeof req.body.cover_letter === 'string' ? req.body.cover_letter : null;
    const reason = typeof req.body.reason === 'string' ? req.body.reason : null;

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'CV file is required' });
    if (!file.buffer) return res.status(400).json({ error: 'CV upload corrupted' });

    return CommunityController.respond(res, async () => {
      const cvFileUrl = await storePublicUpload({
        pathPrefix: `applications/community-events/${eventApplicationId}`,
        buffer: file.buffer!,
        originalFilename: file.originalname || 'cv.pdf',
        contentType: file.mimetype || 'application/pdf',
      });
      return CommunityService.submitEventApplication(eventApplicationId, userId, {
        phoneNumber: phone_number,
        coverLetter: cover_letter,
        reason,
        cvFileUrl,
      });
    });
  }

  static async cancelEventApplication(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const eventApplicationId = requireIntParam(req, 'eventApplicationId');
    const note = typeof req.body?.note === 'string' ? req.body.note : undefined;
    return CommunityController.respond(res, () => CommunityService.cancelEventApplication(eventApplicationId, userId, note));
  }

  static async decideEventApplication(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const eventApplicationId = requireIntParam(req, 'eventApplicationId');
    const { status, note } = req.body || {};
    const decisionStatus = String(status || '').toLowerCase();
    if (!['approved', 'rejected', 'cancelled', 'pending'].includes(decisionStatus)) {
      return res.status(400).json({ error: 'Invalid decision status' });
    }

    return CommunityController.respond(res, () =>
      CommunityService.decideEventApplication(eventApplicationId, userId, {
        status: decisionStatus === 'pending' ? 'pending' : (decisionStatus as any),
        note: typeof note === 'string' ? note : undefined,
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Jobs
  // ─────────────────────────────────────────────────────────────────────────────
  static async getCommunityJobPosts(req: AuthenticatedRequest, res: Response) {
    const communityId = requireIntParam(req, 'communityId');
    return CommunityController.respond(res, () => CommunityService.getCommunityJobPosts(communityId));
  }

  static async getJobBoardPosts(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    return CommunityController.respond(res, () => CommunityService.getJobBoardPosts(userId));
  }

  static async createJobBoardPost(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const { title, company_name, description, post_type, deadline_date } = req.body || {};
    return CommunityController.respond(
      res,
      () =>
        CommunityService.createJobBoardPost(userId, {
          title: String(title || '').trim(),
          companyName: typeof company_name === 'string' ? company_name.trim() : null,
          description: typeof description === 'string' ? description : null,
          postType: String(post_type || 'internship'),
          deadlineDate: deadline_date ? new Date(deadline_date) : null,
        }),
      201
    );
  }

  static async updateJobBoardPost(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const jobPostId = requireIntParam(req, 'jobPostId');
    const { title, company_name, description, post_type, deadline_date } = req.body || {};
    return CommunityController.respond(res, () =>
      CommunityService.updateJobBoardPost(jobPostId, userId, {
        title: String(title || '').trim(),
        companyName: typeof company_name === 'string' ? company_name.trim() : null,
        description: typeof description === 'string' ? description : null,
        postType: String(post_type || 'internship'),
        deadlineDate: deadline_date ? new Date(deadline_date) : null,
      })
    );
  }

  static async deleteJobBoardPost(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const jobPostId = requireIntParam(req, 'jobPostId');
    return CommunityController.respond(res, () => CommunityService.deleteJobBoardPost(jobPostId, userId));
  }

  static async createCommunityJobPost(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const communityId = requireIntParam(req, 'communityId');
    const { title, company_name, description, post_type, deadline_date } = req.body || {};
    return CommunityController.respond(
      res,
      () =>
        CommunityService.createCommunityJobPost(communityId, userId, {
          title: String(title || '').trim(),
          companyName: typeof company_name === 'string' ? company_name.trim() : null,
          description: typeof description === 'string' ? description : null,
          postType: String(post_type || 'internship'),
          deadlineDate: deadline_date ? new Date(deadline_date) : null,
        }),
      201
    );
  }

  static async initJobApplication(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const jobPostId = requireIntParam(req, 'jobPostId');
    return CommunityController.respond(res, () => CommunityService.initJobApplication(jobPostId, userId), 201);
  }

  static async getJobApplicationDetails(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const jobApplicationId = requireIntParam(req, 'jobApplicationId');
    return CommunityController.respond(res, () => CommunityService.getJobApplicationDetails(jobApplicationId, userId));
  }

  static async submitJobApplication(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const jobApplicationId = requireIntParam(req, 'jobApplicationId');
    const phone_number = typeof req.body.phone_number === 'string' ? req.body.phone_number : null;
    const cover_letter = typeof req.body.cover_letter === 'string' ? req.body.cover_letter : null;
    const reason = typeof req.body.reason === 'string' ? req.body.reason : null;

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'CV file is required' });
    if (!file.buffer) return res.status(400).json({ error: 'CV upload corrupted' });

    return CommunityController.respond(res, async () => {
      const cvFileUrl = await storePublicUpload({
        pathPrefix: `applications/community-jobs/${jobApplicationId}`,
        buffer: file.buffer!,
        originalFilename: file.originalname || 'cv.pdf',
        contentType: file.mimetype || 'application/pdf',
      });
      return CommunityService.submitJobApplication(jobApplicationId, userId, {
        phoneNumber: phone_number,
        coverLetter: cover_letter,
        reason,
        cvFileUrl,
      });
    });
  }

  static async cancelJobApplication(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const jobApplicationId = requireIntParam(req, 'jobApplicationId');
    const note = typeof req.body?.note === 'string' ? req.body.note : undefined;
    return CommunityController.respond(res, () => CommunityService.cancelJobApplication(jobApplicationId, userId, note));
  }

  static async decideJobApplication(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const jobApplicationId = requireIntParam(req, 'jobApplicationId');
    const { status, note } = req.body || {};
    const decisionStatus = String(status || '').toLowerCase();
    if (!['approved', 'rejected', 'cancelled', 'pending'].includes(decisionStatus)) {
      return res.status(400).json({ error: 'Invalid decision status' });
    }

    return CommunityController.respond(res, () =>
      CommunityService.decideJobApplication(jobApplicationId, userId, {
        status: decisionStatus === 'pending' ? 'pending' : (decisionStatus as any),
        note: typeof note === 'string' ? note : undefined,
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin pending applications
  // ─────────────────────────────────────────────────────────────────────────────
  static async getPendingJobApplications(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    return CommunityController.respond(res, () => CommunityService.getPendingJobApplications(userId));
  }

  static async getPendingEventApplications(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const communityId = requireIntParam(req, 'communityId');
    return CommunityController.respond(res, () => CommunityService.getPendingEventApplications(communityId, userId));
  }

  static async getPendingCommunityMemberRequests(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const communityId = requireIntParam(req, 'communityId');
    return CommunityController.respond(res, () => CommunityService.getPendingCommunityMemberRequests(communityId, userId));
  }

  static async decideCommunityMemberRequest(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const communityId = requireIntParam(req, 'communityId');
    const memberUserId = requireIntParam(req, 'memberUserId');
    const status = String(req.body?.status || '').toLowerCase();
    const decision = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : null;
    if (!decision) {
      return res.status(400).json({ error: 'Invalid decision status' });
    }

    return CommunityController.respond(res, () =>
      CommunityService.decideCommunityMemberRequest(communityId, memberUserId, userId, {
        status: decision as any,
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────────────────────────────────────
  static async getMyNotifications(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    return CommunityController.respond(res, () => CommunityService.getMyNotifications(userId));
  }

  static async markNotificationRead(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const notificationId = requireIntParam(req, 'notificationId');
    return CommunityController.respond(res, () => CommunityService.markNotificationRead(notificationId, userId));
  }
}
