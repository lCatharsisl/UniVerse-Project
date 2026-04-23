import { Router } from 'express';
import { SearchController } from './search.controller';
import { authenticateSession } from '../../../../middleware/auth';
import { searchLimiter } from '../../../../middleware/rateLimiter';

const router = Router();

router.get('/', searchLimiter, authenticateSession, SearchController.getSearch);

export { router as searchRouter };
