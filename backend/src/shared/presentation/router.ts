import { Router } from 'express';
import { identityModule } from '../../modules/identity/index';
import { socialModule } from '../../modules/social/index';
import { academicModule } from '../../modules/academic/index';
import { servicesModule } from '../../modules/services/index';
import { campusInfoModule } from '../../modules/campus-info/index';
import { communityModule } from '../../modules/community/index';
import { messagingModule } from '../../modules/messaging/index';
import { notificationsModule } from '../../modules/notifications/index';
import { searchModule } from '../../modules/search/index';
import { bffModule } from '../../modules/bff/index';

const router = Router();

router.use('/bff', bffModule.router);
router.use('/auth', identityModule.router);
router.use('/social', socialModule.router);
router.use('/academic', academicModule.router);
router.use('/services', servicesModule.router);
router.use('/campus', campusInfoModule.router);
router.use('/community', communityModule.router);
router.use('/messages', messagingModule.router);
router.use('/notifications', notificationsModule.router);
router.use('/search', searchModule.router);

export { router as mainRouter };
