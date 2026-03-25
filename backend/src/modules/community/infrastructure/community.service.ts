import { query, queryOne } from '../../../config/db';
import { AppError } from '../../../shared/core/errors';

type UpdateCategoriesInput = {
  categories: string[];
};

type CreateEventInput = {
  title: string;
  description: string | null;
  location: string | null;
  startAt: Date | null;
  endAt: Date | null;
};

type CreateJobInput = {
  title: string;
  companyName: string | null;
  description: string | null;
  postType: string;
  deadlineDate: Date | null;
};

type ApplicationSubmitInput = {
  phoneNumber: string | null;
  coverLetter: string | null;
  reason: string | null;
  cvFileUrl: string;
};

export class CommunityService {
  static async getFairCommunities(currentUserId: number, categoryCode?: string) {
    const params: any[] = [currentUserId];
    const where = categoryCode
      ? (() => {
          params.push(categoryCode);
          return 'WHERE c.category_codes @> ARRAY[$2]::text[]';
        })()
      : '';

    const rows = await query<any>(
      `
      SELECT 
        c.community_id,
        c.community_name,
        c.description,
        c.avatar_url,
        c.cover_url,
        COALESCE(c.category_codes, '{}'::text[]) AS category_codes,
        (
          SELECT COUNT(*)::int
          FROM (
            SELECT member_user_id
            FROM public.community_members
            WHERE community_id = c.community_id AND is_active = true
            UNION
            SELECT user_id
            FROM public.communities
            WHERE community_id = c.community_id
          ) x
        ) AS member_count,
        EXISTS (
          SELECT 1 
          FROM public.community_members cm2
          WHERE cm2.community_id = c.community_id
            AND cm2.member_user_id = $1
            AND cm2.is_active = true
        ) OR c.user_id = $1 AS is_member
      FROM public.communities c
      ${where}
      ORDER BY member_count DESC, c.community_name ASC
      LIMIT 50
      `,
      params
    );

    return { items: rows };
  }

  static async getMyCommunities(userId: number) {
    const communities = await query<any>(
      `
      SELECT
        c.community_id,
        c.user_id AS community_admin_user_id,
        c.community_name,
        c.description,
        c.contact_email,
        c.avatar_url,
        c.cover_url,
        COALESCE(c.category_codes, '{}'::text[]) AS category_codes,

        (c.user_id = $1) AS is_admin,

        CASE
          WHEN c.user_id = $1 THEN 'admin'
          WHEN cm.is_active = true THEN 'active'
          WHEN cm.membership_id IS NOT NULL THEN 'pending'
          ELSE 'none'
        END AS membership_status,

        (
          SELECT COUNT(*)::int
          FROM (
            SELECT member_user_id
            FROM public.community_members
            WHERE community_id = c.community_id AND is_active = true
            UNION
            SELECT user_id
            FROM public.communities
            WHERE community_id = c.community_id
          ) x
        ) AS member_count
      FROM public.communities c
      LEFT JOIN public.community_members cm
        ON cm.community_id = c.community_id
        AND cm.member_user_id = $1
      WHERE
        c.user_id = $1
        OR cm.member_user_id = $1
      ORDER BY is_admin DESC, member_count DESC, c.community_name ASC
      `,
      [userId]
    );

    return { communities };
  }

  static async getCommunityProfile(communityId: number, requesterUserId: number) {
    const community = await queryOne<any>(
      `
      SELECT 
        c.community_id,
        c.user_id AS community_admin_user_id,
        c.community_name,
        c.description,
        c.contact_email,
        c.avatar_url,
        c.cover_url,
        COALESCE(c.category_codes, '{}'::text[]) AS category_codes
      FROM public.communities c
      WHERE c.community_id = $1
      `,
      [communityId]
    );
    if (!community) throw AppError.notFound('Community not found');

    // Community owner should be treated as an active admin-member even if community_members row doesn't exist yet.
    const memberCountRow = await queryOne<{ member_count: string }>(
      `
      SELECT COUNT(*)::text AS member_count
      FROM (
        SELECT member_user_id
        FROM public.community_members
        WHERE community_id = $1 AND is_active = true
        UNION
        SELECT user_id
        FROM public.communities
        WHERE community_id = $1
      ) x
      `,
      [communityId]
    );

    const memberCount = parseInt(memberCountRow?.member_count || '0', 10);

    const membershipRow = await queryOne<{ is_active: boolean }>(
      `
      SELECT is_active
      FROM public.community_members
      WHERE community_id = $1
        AND member_user_id = $2
      `,
      [communityId, requesterUserId]
    );

    const isAdmin = community.community_admin_user_id === requesterUserId;
    const isMember = isAdmin || !!membershipRow?.is_active;
    const membershipStatus = isAdmin ? 'admin' : membershipRow?.is_active ? 'active' : membershipRow ? 'pending' : 'none';

    const membersPreview = await query<any>(
      `
      (
        SELECT 
          u.user_id,
          u.email,
          COALESCE(s.student_name, st.staff_name) AS first_name,
          COALESCE(s.student_surname, st.staff_surname) AS last_name,
          u.profile_image_url AS avatar_url,
          'admin'::varchar AS membership_role,
          NOW() AS joined_at
        FROM public.communities c
        JOIN public.users u ON u.user_id = c.user_id
        LEFT JOIN public.students s ON s.user_id = u.user_id
        LEFT JOIN public.staff st ON st.user_id = u.user_id
        WHERE c.community_id = $1
      )
      UNION ALL
      (
        SELECT 
          u.user_id,
          u.email,
          COALESCE(s.student_name, st.staff_name) AS first_name,
          COALESCE(s.student_surname, st.staff_surname) AS last_name,
          u.profile_image_url AS avatar_url,
          cm.role AS membership_role,
          cm.joined_at
        FROM public.community_members cm
        JOIN public.users u ON u.user_id = cm.member_user_id
        LEFT JOIN public.students s ON s.user_id = u.user_id
        LEFT JOIN public.staff st ON st.user_id = u.user_id
        WHERE cm.community_id = $1
          AND cm.is_active = true
      )
      ORDER BY joined_at DESC
      LIMIT 12
      `,
      [communityId]
    );

    const events = await query<any>(
      `
      SELECT 
        event_id,
        title,
        description,
        location,
        start_at,
        end_at,
        created_at
      FROM public.community_events
      WHERE community_id = $1
        AND is_active = true
      ORDER BY created_at DESC
      `,
      [communityId]
    );

    const jobs = await query<any>(
      `
      SELECT 
        job_post_id,
        title,
        company_name,
        description,
        post_type,
        deadline_date,
        created_at
      FROM public.community_job_posts
      WHERE community_id = $1
        AND is_active = true
      ORDER BY deadline_date ASC, created_at DESC
      `,
      [communityId]
    );

    return {
      community,
      memberCount,
      isMember,
      isAdmin,
      membershipStatus,
      membersPreview,
      events,
      jobs,
    };
  }

  static async getMyMembership(communityId: number, userId: number) {
    const community = await queryOne<any>('SELECT community_id, user_id FROM public.communities WHERE community_id=$1', [communityId]);
    if (!community) throw AppError.notFound('Community not found');

    if (community.user_id === userId) {
      // Ensure owner community user is always considered admin-member.
      return { isMember: true, membership: { role: 'admin', joined_at: null, membership_id: null } };
    }

    const row = await queryOne<any>(
      `
      SELECT membership_id, role, joined_at
      FROM public.community_members
      WHERE community_id = $1 AND member_user_id = $2 AND is_active = true
      `,
      [communityId, userId]
    );
    return { isMember: !!row, membership: row || null };
  }

  static async joinCommunity(communityId: number, userId: number) {
    const community = await queryOne<any>('SELECT community_id, user_id FROM public.communities WHERE community_id = $1', [communityId]);
    if (!community) throw AppError.notFound('Community not found');

    const userRole = await queryOne<{ role: string }>('SELECT role FROM public.users WHERE user_id = $1', [userId]);
    if (userRole?.role === 'community' && userId !== community.user_id) {
      throw AppError.forbidden('Only the owner community can join as admin');
    }

    const isOwner = userId === community.user_id;
    const membershipRole = isOwner ? 'admin' : 'member';
    const isActive = isOwner ? true : false; // non-owners require admin approval

    await query(
      `
      INSERT INTO public.community_members (community_id, member_user_id, role, is_active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (community_id, member_user_id)
      DO UPDATE SET role = EXCLUDED.role, is_active = EXCLUDED.is_active
      `,
      [communityId, userId, membershipRole, isActive]
    );

    return { isMember: isActive, membershipStatus: isActive ? 'active' : 'pending' };
  }

  static async leaveCommunity(communityId: number, userId: number) {
    const res = await queryOne<any>(
      `
      DELETE FROM public.community_members
      WHERE community_id = $1
        AND member_user_id = $2
      RETURNING membership_id
      `,
      [communityId, userId]
    );

    if (!res) throw AppError.notFound('Membership not found');

    return { isMember: false, membershipStatus: 'none' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin: pending community member approvals
  // ─────────────────────────────────────────────────────────────────────────────
  static async getPendingCommunityMemberRequests(communityId: number, currentUserId: number) {
    const community = await queryOne<any>('SELECT community_id, user_id FROM public.communities WHERE community_id=$1', [communityId]);
    if (!community) throw AppError.notFound('Community not found');
    if (community.user_id !== currentUserId) throw AppError.forbidden('Not authorized');

    const requests = await query<any>(
      `
      SELECT
        cm.membership_id,
        cm.member_user_id,
        u.email,
        COALESCE(s.student_name, st.staff_name) AS first_name,
        COALESCE(s.student_surname, st.staff_surname) AS last_name,
        cm.joined_at
      FROM public.community_members cm
      JOIN public.users u ON u.user_id = cm.member_user_id
      LEFT JOIN public.students s ON s.user_id = u.user_id
      LEFT JOIN public.staff st ON st.user_id = u.user_id
      WHERE cm.community_id=$1
        AND cm.is_active=false
      ORDER BY cm.joined_at DESC
      `,
      [communityId]
    );

    return { members: requests };
  }

  static async decideCommunityMemberRequest(
    communityId: number,
    memberUserId: number,
    currentUserId: number,
    input: { status: 'approved' | 'rejected' }
  ) {
    if (!['approved', 'rejected'].includes(input.status)) throw AppError.badRequest('Invalid decision status');

    const community = await queryOne<any>('SELECT community_id, user_id FROM public.communities WHERE community_id=$1', [communityId]);
    if (!community) throw AppError.notFound('Community not found');
    if (community.user_id !== currentUserId) throw AppError.forbidden('Not authorized');

    const newIsActive = input.status === 'approved';

    await query(
      `
      UPDATE public.community_members
      SET is_active = $3,
          role = 'member'
      WHERE community_id=$1 AND member_user_id=$2
      `,
      [communityId, memberUserId, newIsActive]
    );

    return { success: true, isActive: newIsActive };
  }

  static async getCommunityMembers(communityId: number) {
    const rows = await query<any>(
      `
      SELECT 
        u.user_id,
        u.email,
        COALESCE(s.student_name, st.staff_name) AS first_name,
        COALESCE(s.student_surname, st.staff_surname) AS last_name,
        u.profile_image_url AS avatar_url,
        cm.role AS membership_role,
        cm.joined_at
      FROM public.community_members cm
      JOIN public.users u ON u.user_id = cm.member_user_id
      LEFT JOIN public.students s ON s.user_id = u.user_id
      LEFT JOIN public.staff st ON st.user_id = u.user_id
      WHERE cm.community_id = $1 AND cm.is_active = true
      ORDER BY cm.joined_at DESC
      `,
      [communityId]
    );
    return { members: rows };
  }

  static async updateCommunityCategories(communityId: number, currentUserId: number, categories: string[]) {
    const community = await queryOne<any>('SELECT community_id, user_id FROM public.communities WHERE community_id = $1', [communityId]);
    if (!community) throw AppError.notFound('Community not found');

    if (community.user_id !== currentUserId) throw AppError.forbidden('Only community owner can edit categories');

    const safe = (categories || []).filter((c) => typeof c === 'string' && c.trim().length > 0);
    await query(
      `
      UPDATE public.communities
      SET category_codes = COALESCE($1::text[], '{}'::text[])
      WHERE community_id = $2
      `,
      [safe, communityId]
    );

    return { categoryCodes: safe };
  }

  static async updateCommunityMedia(
    communityId: number,
    currentUserId: number,
    input: { avatarUrl?: string | null; coverUrl?: string | null }
  ) {
    const community = await queryOne<any>('SELECT community_id, user_id FROM public.communities WHERE community_id = $1', [communityId]);
    if (!community) throw AppError.notFound('Community not found');
    if (community.user_id !== currentUserId) throw AppError.forbidden('Only community owner can update media');

    await query(
      `
      UPDATE public.communities
      SET
        avatar_url = COALESCE($1, avatar_url),
        cover_url = COALESCE($2, cover_url)
      WHERE community_id = $3
      `,
      [input.avatarUrl ?? null, input.coverUrl ?? null, communityId]
    );

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Events
  // ─────────────────────────────────────────────────────────────────────────────
  static async getCommunityEvents(communityId: number) {
    const events = await query<any>(
      `
      SELECT 
        event_id,
        title,
        description,
        location,
        start_at,
        end_at,
        created_at
      FROM public.community_events
      WHERE community_id = $1 AND is_active = true
      ORDER BY created_at DESC
      `,
      [communityId]
    );
    return { events };
  }

  static async createCommunityEvent(communityId: number, currentUserId: number, input: CreateEventInput) {
    if (!input.title) throw AppError.badRequest('Event title is required');

    const community = await queryOne<any>('SELECT community_id, user_id FROM public.communities WHERE community_id = $1', [communityId]);
    if (!community) throw AppError.notFound('Community not found');
    if (community.user_id !== currentUserId) throw AppError.forbidden('Only community owner can create events');

    const inserted = await queryOne<any>(
      `
      INSERT INTO public.community_events (community_id, created_by_user_id, title, description, location, start_at, end_at, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING event_id
      `,
      [communityId, currentUserId, input.title, input.description, input.location, input.startAt, input.endAt]
    );

    await this.notifyCommunityMembers(communityId, {
      kind: 'event_created',
      title: input.title,
      entityType: 'event',
      entityId: inserted.event_id,
      payload: {},
    });

    return { eventId: inserted.event_id };
  }

  static async initEventApplication(eventId: number, applicantUserId: number) {
    const event = await queryOne<any>(
      `
      SELECT e.event_id, e.community_id, e.title
      FROM public.community_events e
      WHERE e.event_id = $1 AND e.is_active = true
      `,
      [eventId]
    );
    if (!event) throw AppError.notFound('Event not found');

    const userRole = await queryOne<{ role: string }>('SELECT role FROM public.users WHERE user_id=$1', [applicantUserId]);
    if (userRole?.role === 'community') throw AppError.forbidden('Community accounts cannot apply');

    const isMember = await queryOne('SELECT 1 as ok FROM public.community_members WHERE community_id=$1 AND member_user_id=$2 AND is_active=true', [
      event.community_id,
      applicantUserId,
    ]);
    if (!isMember) throw AppError.forbidden('Join the community to apply');

    const existing = await queryOne<any>(
      `
      SELECT event_application_id, status
      FROM public.community_event_applications
      WHERE event_id = $1 AND applicant_user_id = $2
      `,
      [eventId, applicantUserId]
    );

    // If already approved, do not reset (user can join directly).
    if (existing?.status && existing.status === 'approved') {
      return { eventApplicationId: existing.event_application_id, status: existing.status, isLocked: true };
    }

    const admin = await queryOne<any>('SELECT user_id FROM public.communities WHERE community_id=$1', [event.community_id]);

    let applicationId: number;
    if (existing) {
      // pending -> keep as is, cancelled -> reset to pending
      if (existing.status === 'pending') {
        return { eventApplicationId: existing.event_application_id, status: existing.status };
      }

      const updated = await queryOne<any>(
        `
        UPDATE public.community_event_applications
        SET 
          status = 'pending',
          is_submitted = false,
          submitted_at = NULL,
          phone_number = NULL,
          cv_file_url = NULL,
          cover_letter = NULL,
          reason = NULL,
          decision_by_user_id = NULL,
          decision_note = NULL,
          created_at = NOW()
        WHERE event_application_id = $1
        RETURNING event_application_id
        `,
        [existing.event_application_id]
      );
      applicationId = updated.event_application_id;
    } else {
      const inserted = await queryOne<any>(
        `
        INSERT INTO public.community_event_applications (event_id, community_id, applicant_user_id)
        VALUES ($1, $2, $3)
        RETURNING event_application_id
        `,
        [eventId, event.community_id, applicantUserId]
      );
      applicationId = inserted.event_application_id;
    }

    await this.createNotificationForUser(admin.user_id, {
      communityId: event.community_id,
      kind: 'event_application_pending',
      title: event.title,
      entityType: 'event_application',
      entityId: applicationId,
      payload: { eventId },
    });

    return { eventApplicationId: applicationId, status: 'pending' };
  }

  static async getEventApplicationDetails(eventApplicationId: number, requesterUserId: number) {
    const app = await queryOne<any>(
      `
      SELECT 
        a.event_application_id,
        a.event_id,
        a.community_id,
        a.applicant_user_id,
        a.phone_number,
        a.cv_file_url,
        a.cover_letter,
        a.reason,
        a.status,
        a.is_submitted,
        a.created_at,
        a.submitted_at
      FROM public.community_event_applications a
      WHERE a.event_application_id = $1
      `,
      [eventApplicationId]
    );
    if (!app) throw AppError.notFound('Application not found');

    if (app.applicant_user_id !== requesterUserId) {
      // Allow community admin to view as well (same authorization used for decisions)
      const adminUser = await queryOne<any>('SELECT user_id FROM public.communities WHERE community_id=$1', [app.community_id]);
      if (!adminUser || adminUser.user_id !== requesterUserId) throw AppError.forbidden('Not authorized');
    }

    const event = await queryOne<any>(
      `
      SELECT event_id, title
      FROM public.community_events
      WHERE event_id=$1
      `,
      [app.event_id]
    );
    const community = await queryOne<any>(
      `
      SELECT community_id, community_name
      FROM public.communities
      WHERE community_id=$1
      `,
      [app.community_id]
    );

    return { application: app, event, community };
  }

  static async submitEventApplication(eventApplicationId: number, applicantUserId: number, input: ApplicationSubmitInput) {
    const fileUrl = input.cvFileUrl;
    if (!fileUrl) throw AppError.badRequest('CV file is required');

    const updated = await queryOne<any>(
      `
      UPDATE public.community_event_applications
      SET
        phone_number = $1,
        cv_file_url = $2,
        cover_letter = $3,
        reason = $4,
        is_submitted = true,
        submitted_at = NOW(),
        status = 'pending',
        decision_by_user_id = NULL,
        decision_note = NULL
      WHERE event_application_id = $5 AND applicant_user_id = $6 AND status = 'pending'
      RETURNING *
      `,
      [input.phoneNumber, input.cvFileUrl, input.coverLetter, input.reason, eventApplicationId, applicantUserId]
    );

    if (!updated) throw AppError.forbidden('Application not found or not owned by you');

    const admin = await queryOne<any>('SELECT user_id FROM public.communities WHERE community_id=$1', [updated.community_id]);
    const event = await queryOne<any>('SELECT title FROM public.community_events WHERE event_id=$1', [updated.event_id]);

    await this.createNotificationForUser(admin.user_id, {
      communityId: updated.community_id,
      kind: 'event_application_submitted',
      title: event?.title || 'Event',
      entityType: 'event_application',
      entityId: updated.event_application_id,
      payload: { eventApplicationId },
    });

    return { applicationId: updated.event_application_id };
  }

  static async decideEventApplication(
    eventApplicationId: number,
    communityAdminUserId: number,
    input: { status: 'approved' | 'rejected' | 'cancelled' | 'pending'; note?: string }
  ) {
    if (!['approved', 'rejected', 'cancelled', 'pending'].includes(input.status)) {
      throw AppError.badRequest('Invalid decision status');
    }

    const app = await queryOne<any>(
      `
      SELECT a.*, c.user_id AS community_admin_user_id
      FROM public.community_event_applications a
      JOIN public.communities c ON c.community_id = a.community_id
      WHERE a.event_application_id=$1
      `,
      [eventApplicationId]
    );
    if (!app) throw AppError.notFound('Application not found');

    if (app.community_admin_user_id !== communityAdminUserId) throw AppError.forbidden('Not authorized');

    if (app.status !== 'pending') throw AppError.badRequest('Application is not pending');
    if (input.status === 'pending') throw AppError.badRequest('Decision must be approved/rejected/cancelled');

    const updated = await queryOne<any>(
      `
      UPDATE public.community_event_applications
      SET
        status = $1,
        decision_by_user_id = $2,
        decision_note = $3
      WHERE event_application_id=$4
      RETURNING *
      `,
      [input.status, communityAdminUserId, input.note || null, eventApplicationId]
    );

    const event = await queryOne<any>('SELECT title FROM public.community_events WHERE event_id=$1', [app.event_id]);

    await this.createNotificationForUser(app.applicant_user_id, {
      communityId: app.community_id,
      kind: 'event_application_decision',
      title: event?.title || 'Event',
      entityType: 'event_application',
      entityId: app.event_application_id,
      payload: { status: updated.status },
    });

    return { applicationId: updated.event_application_id, status: updated.status };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Jobs
  // ─────────────────────────────────────────────────────────────────────────────
  static async getCommunityJobPosts(communityId: number) {
    const rows = await query<any>(
      `
      SELECT 
        job_post_id,
        title,
        description,
        post_type,
        deadline_date,
        created_at
      FROM public.community_job_posts
      WHERE community_id = $1 AND is_active = true
      ORDER BY deadline_date ASC, created_at DESC
      `,
      [communityId]
    );
    return { jobs: rows };
  }

  static async getJobBoardPosts(currentUserId: number) {
    const rows = await query<any>(
      `
      SELECT
        jp.job_post_id,
        jp.created_by_user_id,
        jp.title,
        jp.company_name,
        jp.description,
        jp.post_type,
        jp.deadline_date,
        jp.created_at,
        ja.job_application_id AS my_job_application_id,
        ja.status AS my_job_application_status,
        ja.is_submitted AS my_job_application_submitted
      FROM public.community_job_posts jp
      LEFT JOIN public.community_job_applications ja
        ON ja.job_post_id = jp.job_post_id
       AND ja.applicant_user_id = $1
      WHERE jp.is_active = true
      ORDER BY jp.created_at DESC, jp.deadline_date ASC
      `,
      [currentUserId]
    );
    return { jobs: rows };
  }

  static async updateJobBoardPost(
    jobPostId: number,
    currentUserId: number,
    input: { title: string; companyName: string | null; description: string | null; postType: string; deadlineDate: Date | null }
  ) {
    if (!input.title) throw AppError.badRequest('Job post title is required');
    if (!['internship', 'job'].includes(input.postType)) throw AppError.badRequest('Invalid post type');
    if (!input.deadlineDate || Number.isNaN(input.deadlineDate.getTime())) throw AppError.badRequest('deadline_date is required');

    const userRole = await queryOne<{ role: string }>('SELECT role FROM public.users WHERE user_id=$1', [currentUserId]);
    if (!userRole || !['staff', 'admin'].includes(userRole.role)) {
      throw AppError.forbidden('Only staff can update job posts');
    }

    const existing = await queryOne<{ created_by_user_id: number | null }>(
      'SELECT created_by_user_id FROM public.community_job_posts WHERE job_post_id=$1 AND is_active=true',
      [jobPostId]
    );
    if (!existing) throw AppError.notFound('Job post not found');

    if (userRole.role !== 'admin' && existing.created_by_user_id && existing.created_by_user_id !== currentUserId) {
      throw AppError.forbidden('You can only edit your own posts');
    }

    const deadline = input.deadlineDate.toISOString().slice(0, 10);
    await query(
      `
      UPDATE public.community_job_posts
      SET
        title = $1,
        company_name = $2,
        description = $3,
        post_type = $4,
        deadline_date = $5
      WHERE job_post_id = $6
      `,
      [input.title, input.companyName, input.description, input.postType, deadline, jobPostId]
    );

    return { success: true };
  }

  static async deleteJobBoardPost(jobPostId: number, currentUserId: number) {
    const userRole = await queryOne<{ role: string }>('SELECT role FROM public.users WHERE user_id=$1', [currentUserId]);
    if (!userRole || !['staff', 'admin'].includes(userRole.role)) {
      throw AppError.forbidden('Only staff can delete job posts');
    }

    const existing = await queryOne<{ created_by_user_id: number | null }>(
      'SELECT created_by_user_id FROM public.community_job_posts WHERE job_post_id=$1 AND is_active=true',
      [jobPostId]
    );
    if (!existing) throw AppError.notFound('Job post not found');

    if (userRole.role !== 'admin' && existing.created_by_user_id && existing.created_by_user_id !== currentUserId) {
      throw AppError.forbidden('You can only delete your own posts');
    }

    await query('UPDATE public.community_job_posts SET is_active=false WHERE job_post_id=$1', [jobPostId]);
    return { success: true };
  }

  static async createJobBoardPost(currentUserId: number, input: CreateJobInput) {
    const role = await queryOne<{ role: string }>('SELECT role FROM public.users WHERE user_id=$1', [currentUserId]);
    if (!role || !['staff', 'admin'].includes(role.role)) {
      throw AppError.forbidden('Only staff can create job/internship posts');
    }

    // Board is global for students; community relation is kept internal for existing schema.
    const community = await queryOne<any>('SELECT community_id FROM public.communities ORDER BY community_id ASC LIMIT 1');
    if (!community) throw AppError.notFound('Community not found');

    const result = await this.createCommunityJobPost(community.community_id, currentUserId, input, { notifyMembers: false });

    await this.notifyAllStudents({
      communityId: community.community_id,
      kind: 'job_post_created',
      title: input.title,
      entityType: 'job_post',
      entityId: result.jobPostId,
      payload: { postType: input.postType },
    });

    return result;
  }

  static async createCommunityJobPost(
    communityId: number,
    currentUserId: number,
    input: CreateJobInput,
    options?: { notifyMembers?: boolean }
  ) {
    if (!input.title) throw AppError.badRequest('Job post title is required');
    if (!['internship', 'job'].includes(input.postType)) throw AppError.badRequest('Invalid post type');
    if (!input.deadlineDate || Number.isNaN(input.deadlineDate.getTime())) throw AppError.badRequest('deadline_date is required');

    const community = await queryOne<any>('SELECT community_id, user_id FROM public.communities WHERE community_id = $1', [communityId]);
    if (!community) throw AppError.notFound('Community not found');

    // Job / internship postings are managed by staff (not community owners).
    const userRole = await queryOne<{ role: string }>('SELECT role FROM public.users WHERE user_id=$1', [currentUserId]);
    if (!userRole || !['staff', 'admin'].includes(userRole.role)) {
      throw AppError.forbidden('Only staff can create job posts');
    }

    const deadline = input.deadlineDate.toISOString().slice(0, 10);

    const inserted = await queryOne<any>(
      `
      INSERT INTO public.community_job_posts
        (community_id, created_by_user_id, title, company_name, description, post_type, deadline_date, is_active)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING job_post_id
      `,
      [communityId, currentUserId, input.title, input.companyName, input.description, input.postType, deadline]
    );

    if (options?.notifyMembers !== false) {
      await this.notifyCommunityMembers(communityId, {
        kind: 'job_post_created',
        title: input.title,
        entityType: 'job_post',
        entityId: inserted.job_post_id,
        payload: { postType: input.postType },
      });
    }

    return { jobPostId: inserted.job_post_id };
  }

  static async initJobApplication(jobPostId: number, applicantUserId: number) {
    const job = await queryOne<any>(
      `
      SELECT jp.job_post_id, jp.community_id, jp.title, jp.deadline_date, jp.created_by_user_id
      FROM public.community_job_posts jp
      WHERE jp.job_post_id=$1 AND jp.is_active=true
      `,
      [jobPostId]
    );
    if (!job) throw AppError.notFound('Job post not found');

    const userRole = await queryOne<{ role: string }>('SELECT role FROM public.users WHERE user_id=$1', [applicantUserId]);
    if (userRole?.role === 'community') throw AppError.forbidden('Community accounts cannot apply');

    const today = new Date();
    const deadline = job.deadline_date ? new Date(job.deadline_date) : null;
    if (deadline && !Number.isNaN(deadline.getTime()) && deadline.getTime() < new Date(today.toISOString().slice(0, 10)).getTime()) {
      throw AppError.forbidden('Deadline has passed');
    }

    const existing = await queryOne<any>(
      `
      SELECT job_application_id, status
      FROM public.community_job_applications
      WHERE job_post_id=$1 AND applicant_user_id=$2
      `,
      [jobPostId, applicantUserId]
    );

    if (existing?.status && ['approved', 'rejected'].includes(existing.status)) {
      return { jobApplicationId: existing.job_application_id, status: existing.status, isLocked: true };
    }

    let applicationId: number;
    if (existing) {
      if (existing.status === 'pending') {
        return { jobApplicationId: existing.job_application_id, status: existing.status };
      }

      const updated = await queryOne<any>(
        `
        UPDATE public.community_job_applications
        SET 
          status = 'pending',
          is_submitted = false,
          submitted_at = NULL,
          phone_number = NULL,
          cv_file_url = NULL,
          cover_letter = NULL,
          reason = NULL,
          decision_by_user_id = NULL,
          decision_note = NULL,
          created_at = NOW()
        WHERE job_application_id=$1
        RETURNING job_application_id
        `,
        [existing.job_application_id]
      );
      applicationId = updated.job_application_id;
    } else {
      const inserted = await queryOne<any>(
        `
        INSERT INTO public.community_job_applications
          (job_post_id, community_id, applicant_user_id)
        VALUES ($1, $2, $3)
        RETURNING job_application_id
        `,
        [jobPostId, job.community_id, applicantUserId]
      );
      applicationId = inserted.job_application_id;
    }

    if (job.created_by_user_id) {
      await this.createNotificationForUser(job.created_by_user_id, {
        communityId: null,
        kind: 'job_application_pending',
        title: job.title,
        entityType: 'job_application',
        entityId: applicationId,
        payload: { jobPostId },
      });
    }

    return { jobApplicationId: applicationId, status: 'pending' };
  }

  static async cancelEventApplication(eventApplicationId: number, applicantUserId: number, note?: string) {
    const app = await queryOne<any>(
      `
      SELECT *
      FROM public.community_event_applications
      WHERE event_application_id=$1
      `,
      [eventApplicationId]
    );
    if (!app) throw AppError.notFound('Application not found');
    if (app.applicant_user_id !== applicantUserId) throw AppError.forbidden('Not authorized');
    if (app.status === 'cancelled') return { applicationId: eventApplicationId, status: 'cancelled' };

    await query(
      `
      UPDATE public.community_event_applications
      SET
        status = 'cancelled',
        is_submitted = false,
        submitted_at = NULL,
        phone_number = NULL,
        cv_file_url = NULL,
        cover_letter = NULL,
        reason = NULL,
        decision_by_user_id = NULL,
        decision_note = $2
      WHERE event_application_id = $1
      `,
      [eventApplicationId, note || null]
    );

    return { applicationId: eventApplicationId, status: 'cancelled' };
  }

  static async cancelJobApplication(jobApplicationId: number, applicantUserId: number, note?: string) {
    const app = await queryOne<any>(
      `
      SELECT *
      FROM public.community_job_applications
      WHERE job_application_id=$1
      `,
      [jobApplicationId]
    );
    if (!app) throw AppError.notFound('Application not found');
    if (app.applicant_user_id !== applicantUserId) throw AppError.forbidden('Not authorized');
    if (app.status === 'cancelled') return { applicationId: jobApplicationId, status: 'cancelled' };

    await query(
      `
      UPDATE public.community_job_applications
      SET
        status = 'cancelled',
        is_submitted = false,
        submitted_at = NULL,
        phone_number = NULL,
        cv_file_url = NULL,
        cover_letter = NULL,
        reason = NULL,
        decision_by_user_id = NULL,
        decision_note = $2
      WHERE job_application_id = $1
      `,
      [jobApplicationId, note || null]
    );

    return { applicationId: jobApplicationId, status: 'cancelled' };
  }

  static async getJobApplicationDetails(jobApplicationId: number, requesterUserId: number) {
    const app = await queryOne<any>(
      `
      SELECT 
        a.job_application_id,
        a.job_post_id,
        a.community_id,
        a.applicant_user_id,
        a.phone_number,
        a.cv_file_url,
        a.cover_letter,
        a.reason,
        a.status,
        a.is_submitted,
        a.created_at,
        a.submitted_at
      FROM public.community_job_applications a
      WHERE a.job_application_id = $1
      `,
      [jobApplicationId]
    );
    if (!app) throw AppError.notFound('Application not found');

    if (app.applicant_user_id !== requesterUserId) {
      const userRole = await queryOne<{ role: string }>('SELECT role FROM public.users WHERE user_id=$1', [requesterUserId]);
      if (!userRole || !['staff', 'admin'].includes(userRole.role)) throw AppError.forbidden('Not authorized');
    }

    const post = await queryOne<any>(
      `
      SELECT job_post_id, title, post_type, deadline_date
      FROM public.community_job_posts
      WHERE job_post_id=$1
      `,
      [app.job_post_id]
    );
    return { application: app, post };
  }

  static async submitJobApplication(jobApplicationId: number, applicantUserId: number, input: ApplicationSubmitInput) {
    if (!input.cvFileUrl) throw AppError.badRequest('CV file is required');

    const updated = await queryOne<any>(
      `
      UPDATE public.community_job_applications
      SET
        phone_number = $1,
        cv_file_url = $2,
        cover_letter = $3,
        reason = $4,
        is_submitted = true,
        submitted_at = NOW(),
        status = 'pending',
        decision_by_user_id = NULL,
        decision_note = NULL
      WHERE job_application_id = $5 AND applicant_user_id = $6 AND status = 'pending'
      RETURNING *
      `,
      [input.phoneNumber, input.cvFileUrl, input.coverLetter, input.reason, jobApplicationId, applicantUserId]
    );

    if (!updated) throw AppError.forbidden('Application not found or not owned by you');

    const post = await queryOne<any>(
      'SELECT title, created_by_user_id FROM public.community_job_posts WHERE job_post_id=$1',
      [updated.job_post_id]
    );

    if (post?.created_by_user_id) {
      await this.upsertNotificationForUser(post.created_by_user_id, {
        communityId: null,
        kind: 'job_application_submitted',
        title: post?.title || 'Job',
        entityType: 'job_application',
        entityId: updated.job_application_id,
        payload: { jobApplicationId },
      });
    }

    return { applicationId: updated.job_application_id };
  }

  static async decideJobApplication(
    jobApplicationId: number,
    currentUserId: number,
    input: { status: 'approved' | 'rejected' | 'cancelled' | 'pending'; note?: string }
  ) {
    if (!['approved', 'rejected', 'cancelled', 'pending'].includes(input.status)) {
      throw AppError.badRequest('Invalid decision status');
    }

    const app = await queryOne<any>(
      `
      SELECT a.*
      FROM public.community_job_applications a
      WHERE a.job_application_id=$1
      `,
      [jobApplicationId]
    );
    if (!app) throw AppError.notFound('Application not found');

    // Decisions for job/intern applications are managed by staff.
    const userRole = await queryOne<{ role: string }>('SELECT role FROM public.users WHERE user_id=$1', [currentUserId]);
    if (!userRole || !['staff', 'admin'].includes(userRole.role)) {
      throw AppError.forbidden('Only staff can decide job applications');
    }
    if (app.status !== 'pending') throw AppError.badRequest('Application is not pending');
    if (input.status === 'pending') throw AppError.badRequest('Decision must be approved/rejected/cancelled');

    const updated = await queryOne<any>(
      `
      UPDATE public.community_job_applications
      SET
        status = $1,
        decision_by_user_id = $2,
        decision_note = $3
      WHERE job_application_id=$4
      RETURNING *
      `,
      [input.status, currentUserId, input.note || null, jobApplicationId]
    );

    const post = await queryOne<any>('SELECT title FROM public.community_job_posts WHERE job_post_id=$1', [app.job_post_id]);

    await this.createNotificationForUser(app.applicant_user_id, {
      communityId: null,
      kind: 'job_application_decision',
      title: post?.title || 'Job',
      entityType: 'job_application',
      entityId: app.job_application_id,
      payload: { status: updated.status },
    });

    return { applicationId: updated.job_application_id, status: updated.status };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin lists
  // ─────────────────────────────────────────────────────────────────────────────
  static async getPendingJobApplications(currentUserId: number) {
    // Job application decisions are staff-controlled.
    const userRole = await queryOne<{ role: string }>('SELECT role FROM public.users WHERE user_id=$1', [currentUserId]);
    if (!userRole || !['staff', 'admin'].includes(userRole.role)) {
      throw AppError.forbidden('Only staff can view pending job applications');
    }

    const apps = await query<any>(
      `
      SELECT
        a.job_application_id,
        a.job_post_id,
        a.applicant_user_id,
        a.phone_number,
        a.cv_file_url,
        a.cover_letter,
        a.reason,
        a.status,
        a.is_submitted,
        a.created_at,
        a.submitted_at,
        u.email AS applicant_email,
        COALESCE(s.student_name, st.staff_name) AS first_name,
        COALESCE(s.student_surname, st.staff_surname) AS last_name,
        p.title AS post_title,
        p.post_type,
        p.deadline_date
      FROM public.community_job_applications a
      JOIN public.community_job_posts p ON p.job_post_id = a.job_post_id
      JOIN public.users u ON u.user_id = a.applicant_user_id
      LEFT JOIN public.students s ON s.user_id = u.user_id
      LEFT JOIN public.staff st ON st.user_id = u.user_id
      WHERE a.status='pending'
      ORDER BY a.created_at DESC
      `
    );

    return { applications: apps };
  }

  static async getPendingEventApplications(communityId: number, currentUserId: number) {
    const community = await queryOne<any>('SELECT community_id, user_id FROM public.communities WHERE community_id=$1', [communityId]);
    if (!community) throw AppError.notFound('Community not found');
    if (community.user_id !== currentUserId) throw AppError.forbidden('Not authorized');

    const apps = await query<any>(
      `
      SELECT
        a.event_application_id,
        a.event_id,
        a.applicant_user_id,
        a.phone_number,
        a.cv_file_url,
        a.cover_letter,
        a.reason,
        a.status,
        a.is_submitted,
        a.created_at,
        a.submitted_at,
        u.email AS applicant_email,
        COALESCE(s.student_name, st.staff_name) AS first_name,
        COALESCE(s.student_surname, st.staff_surname) AS last_name,
        e.title AS event_title,
        e.start_at,
        e.end_at
      FROM public.community_event_applications a
      JOIN public.community_events e ON e.event_id = a.event_id
      JOIN public.users u ON u.user_id = a.applicant_user_id
      LEFT JOIN public.students s ON s.user_id = u.user_id
      LEFT JOIN public.staff st ON st.user_id = u.user_id
      WHERE a.community_id=$1 AND a.status='pending'
      ORDER BY a.created_at DESC
      `,
      [communityId]
    );

    return { applications: apps };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────────────────────────────────────
  static async getMyNotifications(userId: number) {
    const rows = await query<any>(
      `
      SELECT
        notification_id,
        recipient_user_id,
        community_id,
        kind,
        title,
        message,
        entity_type,
        entity_id,
        payload,
        is_read,
        created_at
      FROM public.community_notifications cn
      WHERE cn.recipient_user_id=$1
        AND (
          cn.community_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.communities c
            WHERE c.community_id = cn.community_id
              AND (
                c.user_id = $1
                OR EXISTS (
                  SELECT 1
                  FROM public.community_members cm
                  WHERE cm.community_id = cn.community_id
                    AND cm.member_user_id = $1
                    AND cm.is_active = true
                )
              )
          )
        )
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId]
    );
    return { notifications: rows };
  }

  static async markNotificationRead(notificationId: number, userId: number) {
    const updated = await queryOne<any>(
      `
      UPDATE public.community_notifications
      SET is_read=true
      WHERE notification_id=$1 AND recipient_user_id=$2
      RETURNING notification_id
      `,
      [notificationId, userId]
    );
    if (!updated) throw AppError.notFound('Notification not found');
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Notification helpers
  // ─────────────────────────────────────────────────────────────────────────────
  private static async notifyCommunityMembers(
    communityId: number,
    input: { kind: string; title: string; entityType: string; entityId: number; payload: any }
  ) {
    await query(
      `
      INSERT INTO public.community_notifications
        (recipient_user_id, community_id, kind, title, message, entity_type, entity_id, payload)
      SELECT
        recipients.user_id,
        $1::int,
        $2::varchar,
        $3::text,
        NULL::text,
        $4::varchar,
        $5::int,
        $6::jsonb
      FROM (
        SELECT member_user_id AS user_id
        FROM public.community_members
        WHERE community_id = $1 AND is_active = true

        UNION

        SELECT user_id AS user_id
        FROM public.communities
        WHERE community_id = $1
      ) recipients
      `,
      [communityId, input.kind, input.title, input.entityType, input.entityId, JSON.stringify(input.payload || {})]
    );
  }

  private static async createNotificationForUser(
    recipientUserId: number,
    input: { communityId: number | null; kind: string; title: string; entityType: string; entityId: number; payload: any }
  ) {
    await query(
      `
      INSERT INTO public.community_notifications
        (recipient_user_id, community_id, kind, title, message, entity_type, entity_id, payload)
      VALUES
        ($1, $2, $3, $4, NULL, $5, $6, $7::jsonb)
      `,
      [
        recipientUserId,
        input.communityId,
        input.kind,
        input.title,
        input.entityType,
        input.entityId,
        JSON.stringify(input.payload || {}),
      ]
    );
  }

  private static async upsertNotificationForUser(
    recipientUserId: number,
    input: { communityId: number | null; kind: string; title: string; entityType: string; entityId: number; payload: any }
  ) {
    const existing = await queryOne<{ notification_id: number }>(
      `
      SELECT notification_id
      FROM public.community_notifications
      WHERE recipient_user_id = $1
        AND kind = $2
        AND entity_type = $3
        AND entity_id = $4
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [recipientUserId, input.kind, input.entityType, input.entityId]
    );

    if (existing) {
      await query(
        `
        UPDATE public.community_notifications
        SET
          community_id = $1,
          title = $2,
          payload = $3::jsonb,
          is_read = false,
          created_at = NOW()
        WHERE notification_id = $4
        `,
        [input.communityId, input.title, JSON.stringify(input.payload || {}), existing.notification_id]
      );
      return;
    }

    await this.createNotificationForUser(recipientUserId, input);
  }

  private static async notifyAllStudents(
    input: { communityId: number; kind: string; title: string; entityType: string; entityId: number; payload: any }
  ) {
    await query(
      `
      INSERT INTO public.community_notifications
        (recipient_user_id, community_id, kind, title, message, entity_type, entity_id, payload)
      SELECT
        u.user_id,
        NULL::int,
        $1::varchar,
        $2::text,
        NULL::text,
        $3::varchar,
        $4::int,
        $5::jsonb
      FROM public.users u
      WHERE u.role = 'student'
      `,
      [input.kind, input.title, input.entityType, input.entityId, JSON.stringify(input.payload || {})]
    );
  }
}

