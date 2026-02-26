import { Router } from 'express';
import { identityModule } from '../../modules/identity/index';
import { socialModule } from '../../modules/social/index';
import { academicModule } from '../../modules/academic/index';
import { servicesModule } from '../../modules/services/index';
import { campusInfoModule } from '../../modules/campus-info/index';

const router = Router();

router.use('/auth', identityModule.router);
router.use('/social', socialModule.router);
router.use('/academic', academicModule.router);
router.use('/services', servicesModule.router);
router.use('/campus', campusInfoModule.router);

export { router as mainRouter };
