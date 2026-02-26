import { Router } from 'express';
import { AcademicController } from './academic.controller';

const router = Router();

router.get('/free-rooms', AcademicController.getFreeRooms);

export { router as academicRouter };
