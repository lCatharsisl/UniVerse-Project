import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../middleware/auth';
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
    return CommunityController.respond(res, () => CommunityService.getFairCommunities(req.userId!, category));
  }

  static async getMyCommunities(req: AuthenticatedRequest, res: Response) {
    const safeUserId = Number(req.userId);
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

    return CommunityController.respond(res, () =>
      CommunityService.getCommunityProfile(communityId, req.userId!)
    );
  }

  static async joinCommunity(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    return CommunityController.respond(res, () => CommunityService.joinCommunity(communityId, req.userId!));
  }

  static async leaveCommunity(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    return CommunityController.respond(res, () => CommunityService.leaveCommunity(communityId, req.userId!));
  }

  static async getMyMembership(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    return CommunityController.respond(res, () => CommunityService.getMyMembership(communityId, req.userId!));
  }

  static async getCommunityMembers(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    return CommunityController.respond(res, () => CommunityService.getCommunityMembers(communityId));
  }

  static async updateCommunityCategories(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    const categories = Array.isArray(req.body?.categories) ? req.body.categories.map((c: any) => String(c)) : [];
    return CommunityController.respond(res, () => CommunityService.updateCommunityCategories(communityId, req.userId!, categories));
  }

  static async updateCommunityMedia(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const avatar = files?.avatar?.[0];
    const cover = files?.cover?.[0];

    if (!avatar && !cover) {
      return res.status(400).json({ error: 'No media file provided' });
    }

    return CommunityController.respond(res, () =>
      CommunityService.updateCommunityMedia(communityId, req.userId!, {
        avatarUrl: avatar ? `/uploads/${avatar.filename}` : undefined,
        coverUrl: cover ? `/uploads/${cover.filename}` : undefined,
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Events
  // ─────────────────────────────────────────────────────────────────────────────
  static async getCommunityEvents(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    return CommunityController.respond(res, () => CommunityService.getCommunityEvents(communityId));
  }

  static async createCommunityEvent(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    const { title, description, location, start_at, end_at } = req.body || {};
    return CommunityController.respond(
      res,
      () =>
        CommunityService.createCommunityEvent(communityId, req.userId!, {
          title: String(title || '').trim(),
          description: typeof description === 'string' ? description : null,
          location: typeof location === 'string' ? location : null,
          startAt: start_at ? new Date(start_at) : null,
          endAt: end_at ? new Date(end_at) : null,
        }),
      201
    );
  }

  static async initEventApplication(req: AuthenticatedRequest, res: Response) {
    const eventId = parseInt(req.params.eventId, 10);
    return CommunityController.respond(
      res,
      () => CommunityService.initEventApplication(eventId, req.userId!),
      201
    );
  }

  static async getEventApplicationDetails(req: AuthenticatedRequest, res: Response) {
    const eventApplicationId = parseInt(req.params.eventApplicationId, 10);
    return CommunityController.respond(res, () => CommunityService.getEventApplicationDetails(eventApplicationId, req.userId!));
  }

  static async submitEventApplication(req: AuthenticatedRequest, res: Response) {
    const eventApplicationId = parseInt(req.params.eventApplicationId, 10);
    const phone_number = typeof req.body.phone_number === 'string' ? req.body.phone_number : null;
    const cover_letter = typeof req.body.cover_letter === 'string' ? req.body.cover_letter : null;
    const reason = typeof req.body.reason === 'string' ? req.body.reason : null;

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'CV file is required' });

    const cvFileUrl = `/uploads/${file.filename}`;
    return CommunityController.respond(res, () =>
      CommunityService.submitEventApplication(eventApplicationId, req.userId!, {
        phoneNumber: phone_number,
        coverLetter: cover_letter,
        reason,
        cvFileUrl,
      })
    );
  }

  static async cancelEventApplication(req: AuthenticatedRequest, res: Response) {
    const eventApplicationId = parseInt(req.params.eventApplicationId, 10);
    const note = typeof req.body?.note === 'string' ? req.body.note : undefined;
    return CommunityController.respond(res, () =>
      CommunityService.cancelEventApplication(eventApplicationId, req.userId!, note)
    );
  }

  static async decideEventApplication(req: AuthenticatedRequest, res: Response) {
    const eventApplicationId = parseInt(req.params.eventApplicationId, 10);
    const { status, note } = req.body || {};
    const decisionStatus = String(status || '').toLowerCase();
    if (!['approved', 'rejected', 'cancelled', 'pending'].includes(decisionStatus)) {
      return res.status(400).json({ error: 'Invalid decision status' });
    }

    return CommunityController.respond(res, () =>
      CommunityService.decideEventApplication(eventApplicationId, req.userId!, {
        status: decisionStatus === 'pending' ? 'pending' : (decisionStatus as any),
        note: typeof note === 'string' ? note : undefined,
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Jobs
  // ─────────────────────────────────────────────────────────────────────────────
  static async getCommunityJobPosts(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    return CommunityController.respond(res, () => CommunityService.getCommunityJobPosts(communityId));
  }

  static async getJobBoardPosts(req: AuthenticatedRequest, res: Response) {
    return CommunityController.respond(res, () => CommunityService.getJobBoardPosts(req.userId!));
  }

  static async createJobBoardPost(req: AuthenticatedRequest, res: Response) {
    const { title, company_name, description, post_type, deadline_date } = req.body || {};
    return CommunityController.respond(
      res,
      () =>
        CommunityService.createJobBoardPost(req.userId!, {
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
    const jobPostId = parseInt(req.params.jobPostId, 10);
    const { title, company_name, description, post_type, deadline_date } = req.body || {};
    return CommunityController.respond(res, () =>
      CommunityService.updateJobBoardPost(jobPostId, req.userId!, {
        title: String(title || '').trim(),
        companyName: typeof company_name === 'string' ? company_name.trim() : null,
        description: typeof description === 'string' ? description : null,
        postType: String(post_type || 'internship'),
        deadlineDate: deadline_date ? new Date(deadline_date) : null,
      })
    );
  }

  static async deleteJobBoardPost(req: AuthenticatedRequest, res: Response) {
    const jobPostId = parseInt(req.params.jobPostId, 10);
    return CommunityController.respond(res, () => CommunityService.deleteJobBoardPost(jobPostId, req.userId!));
  }

  static async createCommunityJobPost(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    const { title, company_name, description, post_type, deadline_date } = req.body || {};
    return CommunityController.respond(
      res,
      () =>
        CommunityService.createCommunityJobPost(communityId, req.userId!, {
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
    const jobPostId = parseInt(req.params.jobPostId, 10);
    return CommunityController.respond(res, () => CommunityService.initJobApplication(jobPostId, req.userId!), 201);
  }

  static async getJobApplicationDetails(req: AuthenticatedRequest, res: Response) {
    const jobApplicationId = parseInt(req.params.jobApplicationId, 10);
    return CommunityController.respond(res, () => CommunityService.getJobApplicationDetails(jobApplicationId, req.userId!));
  }

  static async submitJobApplication(req: AuthenticatedRequest, res: Response) {
    const jobApplicationId = parseInt(req.params.jobApplicationId, 10);
    const phone_number = typeof req.body.phone_number === 'string' ? req.body.phone_number : null;
    const cover_letter = typeof req.body.cover_letter === 'string' ? req.body.cover_letter : null;
    const reason = typeof req.body.reason === 'string' ? req.body.reason : null;

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'CV file is required' });

    const cvFileUrl = `/uploads/${file.filename}`;
    return CommunityController.respond(res, () =>
      CommunityService.submitJobApplication(jobApplicationId, req.userId!, {
        phoneNumber: phone_number,
        coverLetter: cover_letter,
        reason,
        cvFileUrl,
      })
    );
  }

  static async cancelJobApplication(req: AuthenticatedRequest, res: Response) {
    const jobApplicationId = parseInt(req.params.jobApplicationId, 10);
    const note = typeof req.body?.note === 'string' ? req.body.note : undefined;
    return CommunityController.respond(res, () =>
      CommunityService.cancelJobApplication(jobApplicationId, req.userId!, note)
    );
  }

  static async decideJobApplication(req: AuthenticatedRequest, res: Response) {
    const jobApplicationId = parseInt(req.params.jobApplicationId, 10);
    const { status, note } = req.body || {};
    const decisionStatus = String(status || '').toLowerCase();
    if (!['approved', 'rejected', 'cancelled', 'pending'].includes(decisionStatus)) {
      return res.status(400).json({ error: 'Invalid decision status' });
    }

    return CommunityController.respond(res, () =>
      CommunityService.decideJobApplication(jobApplicationId, req.userId!, {
        status: decisionStatus === 'pending' ? 'pending' : (decisionStatus as any),
        note: typeof note === 'string' ? note : undefined,
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin pending applications
  // ─────────────────────────────────────────────────────────────────────────────
  static async getPendingJobApplications(req: AuthenticatedRequest, res: Response) {
    return CommunityController.respond(res, () => CommunityService.getPendingJobApplications(req.userId!));
  }

  static async getPendingEventApplications(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    return CommunityController.respond(res, () => CommunityService.getPendingEventApplications(communityId, req.userId!));
  }

  static async getPendingCommunityMemberRequests(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    return CommunityController.respond(res, () =>
      CommunityService.getPendingCommunityMemberRequests(communityId, req.userId!)
    );
  }

  static async decideCommunityMemberRequest(req: AuthenticatedRequest, res: Response) {
    const communityId = parseInt(req.params.communityId, 10);
    const memberUserId = parseInt(req.params.memberUserId, 10);
    const status = String(req.body?.status || '').toLowerCase();
    const decision = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : null;
    if (!decision) {
      return res.status(400).json({ error: 'Invalid decision status' });
    }

    return CommunityController.respond(res, () =>
      CommunityService.decideCommunityMemberRequest(communityId, memberUserId, req.userId!, {
        status: decision as any,
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────────────────────────────────────
  static async getMyNotifications(req: AuthenticatedRequest, res: Response) {
    return CommunityController.respond(res, () => CommunityService.getMyNotifications(req.userId!));
  }

  static async markNotificationRead(req: AuthenticatedRequest, res: Response) {
    const notificationId = parseInt(req.params.notificationId, 10);
    return CommunityController.respond(res, () => CommunityService.markNotificationRead(notificationId, req.userId!));
  }
}

