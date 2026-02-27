import { Router } from 'express';
import { CampusInfoController } from './campus-info.controller';

const router = Router();

router.get('/stats', CampusInfoController.getStats);

export { router as campusInfoRouter };
