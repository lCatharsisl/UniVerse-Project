import { Router } from 'express';
import { ServicesController } from './services.controller';
import { authenticateSession } from '../../../../middleware/auth';
import { upload } from '../../../../middleware/upload';

const router = Router();

router.use(authenticateSession);

router.get('/lost-items', ServicesController.getLostItems);
router.post('/lost-items', upload.array('images', 5), ServicesController.createLostItem);
router.put('/lost-items/:id', ServicesController.updateLostItem);
router.delete('/lost-items/:id', ServicesController.deleteLostItem);
router.patch('/lost-items/:id/resolve', ServicesController.resolveLostItem);

router.get('/found-items', ServicesController.getFoundItems);
router.post('/found-items', upload.array('images', 5), ServicesController.createFoundItem);
router.put('/found-items/:id', ServicesController.updateFoundItem);
router.delete('/found-items/:id', ServicesController.deleteFoundItem);
router.patch('/found-items/:id/resolve', ServicesController.resolveFoundItem);

router.post('/:type/:id/comments', ServicesController.addComment);
router.get('/:type/:id/comments', ServicesController.getComments);
router.get('/:type/:id/images', ServicesController.getItemImages);

export { router as servicesRouter };
