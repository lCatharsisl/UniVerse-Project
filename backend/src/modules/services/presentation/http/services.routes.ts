import { Router } from 'express';
import { ServicesController } from './services.controller';
import { authenticateSession } from '../../../../middleware/auth';
import { upload } from '../../../../middleware/upload';
import { uploadLimiter } from '../../../../middleware/rateLimiter';
import { scanUploadedFiles } from '../../../../middleware/scanUploadedFiles';

const router = Router();

router.use(authenticateSession);

router.get('/lost-items', ServicesController.getLostItems);
router.post('/lost-items', uploadLimiter, upload.array('images', 5), scanUploadedFiles, ServicesController.createLostItem);
router.put('/lost-items/:id', ServicesController.updateLostItem);
router.delete('/lost-items/:id', ServicesController.deleteLostItem);
router.patch('/lost-items/:id/resolve', ServicesController.resolveLostItem);

router.get('/found-items', ServicesController.getFoundItems);
router.post('/found-items', uploadLimiter, upload.array('images', 5), scanUploadedFiles, ServicesController.createFoundItem);
router.put('/found-items/:id', ServicesController.updateFoundItem);
router.delete('/found-items/:id', ServicesController.deleteFoundItem);
router.patch('/found-items/:id/resolve', ServicesController.resolveFoundItem);

router.post('/:type/:id/comments', ServicesController.addComment);
router.get('/:type/:id/comments', ServicesController.getComments);
router.get('/:type/:id/images', ServicesController.getItemImages);

export { router as servicesRouter };
