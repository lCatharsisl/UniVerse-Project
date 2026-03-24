import { Router } from 'express';
import { AcademicController } from './academic.controller';
import { authenticateSession } from '../../../../middleware/auth';

const router = Router();

router.get('/free-rooms', AcademicController.getFreeRooms);
router.get('/staff/search', authenticateSession, AcademicController.searchStaff);
router.get('/staff/:staffUserId/availability', authenticateSession, AcademicController.getStaffAvailability);
router.get('/staff/:staffUserId/availability/date', authenticateSession, AcademicController.getStaffAvailabilityByDate);
router.put('/staff/availability', authenticateSession, AcademicController.updateMyAvailability);
router.put('/staff/availability/date', authenticateSession, AcademicController.updateMyAvailabilityByDate);
router.post('/appointments', authenticateSession, AcademicController.createAppointment);
router.get('/appointments', authenticateSession, AcademicController.listAppointments);
router.patch('/appointments/:id/status', authenticateSession, AcademicController.updateAppointmentStatus);
router.get('/appointments/notifications', authenticateSession, AcademicController.getNotifications);
router.patch('/appointments/notifications/:id/read', authenticateSession, AcademicController.markNotificationRead);

export { router as academicRouter };
