import { Router } from 'express';
import { CampusInfoController } from './campus-info.controller';

const router = Router();

router.get('/stats', CampusInfoController.getStats);
router.get('/menu', CampusInfoController.getMenu);
router.get('/menu/full', CampusInfoController.getFullMenu);
router.get('/menu/date/:date', CampusInfoController.getMenuByDate);
router.post('/menu/refresh', CampusInfoController.refreshMenu);

export { router as campusInfoRouter };
