import { Router } from 'express';
import { authenticateSession } from '../../../../middleware/auth';
import { BffController } from './bff.controller';

const router = Router();

router.get('/dashboard-shell', authenticateSession, BffController.dashboardShell);

export { router as bffRouter };
