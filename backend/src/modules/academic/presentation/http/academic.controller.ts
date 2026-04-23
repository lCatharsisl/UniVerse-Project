import { Request, Response } from 'express';
import { GetFreeRoomsHandler } from '../../application/queries/get-free-rooms.handler';
import { AcademicService } from '../../infrastructure/academic.service';
import { AuthenticatedRequest } from '../../../../middleware/auth';

export class AcademicController {
  static async getFreeRooms(req: Request, res: Response) {
    const result = await GetFreeRoomsHandler.execute(req.query);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    return res.json(result.data);
  }

  static async searchStaff(req: Request, res: Response) {
    try {
      const data = await AcademicService.searchStaff(req.query);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to search staff' });
    }
  }

  static async getStaffAvailability(req: Request, res: Response) {
    try {
      const staffUserId = Number(req.params.staffUserId);
      const data = await AcademicService.getStaffAvailability(staffUserId);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to fetch availability' });
    }
  }

  static async getStaffAvailabilityByDate(req: Request, res: Response) {
    try {
      const staffUserId = Number(req.params.staffUserId);
      const date = String(req.query.date || '');
      if (!date) return res.status(400).json({ error: 'date query param is required' });
      const data = await AcademicService.getStaffAvailabilityByDate(staffUserId, date);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to fetch date availability' });
    }
  }

  static async getStaffAvailabilityRange(req: AuthenticatedRequest, res: Response) {
    try {
      const staffUserId = Number(req.params.staffUserId);
      const from = String(req.query.from || '');
      const to = String(req.query.to || '');
      if (!from || !to) {
        return res.status(400).json({ error: 'Query params from and to are required (YYYY-MM-DD)' });
      }
      const viewer =
        req.userId != null && req.userRole
          ? { userId: req.userId, role: String(req.userRole) }
          : null;
      const data = await AcademicService.getStaffAvailabilityRange(staffUserId, from, to, viewer);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to fetch availability range' });
    }
  }

  static async updateMyAvailability(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.userRole !== 'staff') {
        return res.status(403).json({ error: 'Only staff can manage availability' });
      }

      const data = await AcademicService.upsertStaffAvailability(req.userId!, req.body.slots || []);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to update availability' });
    }
  }

  static async updateMyAvailabilityByDate(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.userRole !== 'staff') {
        return res.status(403).json({ error: 'Only staff can manage availability' });
      }

      const date = String(req.body.date || '');
      if (!date) return res.status(400).json({ error: 'date is required' });
      const data = await AcademicService.upsertStaffAvailabilityByDate(req.userId!, date, req.body.slots || []);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to update date availability' });
    }
  }

  static async createAppointment(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.userRole !== 'student') {
        return res.status(403).json({ error: 'Only students can create appointments' });
      }

      const data = await AcademicService.createAppointment(req.userId!, req.body);
      return res.status(201).json(data);
    } catch (error: any) {
      const message = error?.message || 'Failed to create appointment';
      const status = message.includes('Selected slot is not available') ? 409 : 400;
      return res.status(status).json({ error: message });
    }
  }

  static async listAppointments(req: AuthenticatedRequest, res: Response) {
    try {
      const archive = String(req.query.archive || 'false') === 'true';
      const data = await AcademicService.listAppointments(req.userId!, req.userRole || '', archive);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to fetch appointments' });
    }
  }

  static async updateAppointmentStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const appointmentId = Number(req.params.id);
      const data = await AcademicService.updateAppointmentStatus(
        appointmentId,
        req.userId!,
        req.userRole || '',
        req.body
      );
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to update appointment status' });
    }
  }

  static async getNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await AcademicService.getNotifications(req.userId!);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to fetch notifications' });
    }
  }

  static async markNotificationRead(req: AuthenticatedRequest, res: Response) {
    try {
      const notificationId = Number(req.params.id);
      const data = await AcademicService.markNotificationRead(notificationId, req.userId!);
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to update notification' });
    }
  }
}
