import { Request, Response } from 'express';
import { GetLostItemsHandler } from '../../application/queries/get-lost-items.handler';
import { GetFoundItemsHandler } from '../../application/queries/get-found-items.handler';
import { AddLostItemHandler } from '../../application/commands/add-lost-item.handler';
import { AddFoundItemHandler } from '../../application/commands/add-found-item.handler';
import { UpdateLostItemHandler } from '../../application/commands/update-lost-item.handler';
import { UpdateFoundItemHandler } from '../../application/commands/update-found-item.handler';
import { DeleteLostItemHandler } from '../../application/commands/delete-lost-item.handler';
import { DeleteFoundItemHandler } from '../../application/commands/delete-found-item.handler';
import { ResolveItemHandler } from '../../application/commands/resolve-item.handler';
import { AddCommentHandler } from '../../application/commands/add-comment.handler';
import { GetCommentsHandler } from '../../application/queries/get-comments.handler';
import { GetItemImagesHandler } from '../../application/queries/get-item-images.handler';
import { AuthenticatedRequest } from '../../../../middleware/auth';

export class ServicesController {
  static async getLostItems(req: Request, res: Response) {
    const result = await GetLostItemsHandler.execute(req.query);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json(result.data);
  }

  static async getFoundItems(req: Request, res: Response) {
    const result = await GetFoundItemsHandler.execute(req.query);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json(result.data);
  }

  static async createLostItem(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const files = (req.files as Express.Multer.File[]) || [];
    const imageUrls = files.map(file => `/uploads/${file.filename}`);
    const result = await AddLostItemHandler.execute(userId, req.body, imageUrls);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.status(201).json({ message: 'Lost item created', item: result.data });
  }

  static async createFoundItem(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const files = (req.files as Express.Multer.File[]) || [];
    const imageUrls = files.map(file => `/uploads/${file.filename}`);
    const result = await AddFoundItemHandler.execute(userId, req.body, imageUrls);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.status(201).json({ message: 'Found item created', item: result.data });
  }

  static async updateLostItem(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { id } = req.params;
    const result = await UpdateLostItemHandler.execute(parseInt(id), userId, req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Lost item updated successfully' });
  }

  static async updateFoundItem(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { id } = req.params;
    const result = await UpdateFoundItemHandler.execute(parseInt(id), userId, req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Found item updated successfully' });
  }

  static async deleteLostItem(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { id } = req.params;
    const result = await DeleteLostItemHandler.execute(parseInt(id), userId);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Lost item deleted successfully' });
  }

  static async deleteFoundItem(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { id } = req.params;
    const result = await DeleteFoundItemHandler.execute(parseInt(id), userId);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Found item deleted successfully' });
  }

  static async resolveLostItem(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { id } = req.params;
    const result = await ResolveItemHandler.execute('lost', parseInt(id), userId);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Lost item resolved' });
  }

  static async resolveFoundItem(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { id } = req.params;
    const result = await ResolveItemHandler.execute('found', parseInt(id), userId);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Found item resolved' });
  }

  static async addComment(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { type, id } = req.params;
    if (type !== 'lost' && type !== 'found') return res.status(400).json({ error: 'Invalid item type' });
    const result = await AddCommentHandler.execute(userId, type as any, parseInt(id), req.body.content);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.status(201).json({ message: 'Comment added' });
  }

  static async getComments(req: AuthenticatedRequest, res: Response) {
    const { type, id } = req.params;
    if (type !== 'lost' && type !== 'found') return res.status(400).json({ error: 'Invalid item type' });
    const result = await GetCommentsHandler.execute(type as any, parseInt(id));
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json(result.data);
  }

  static async getItemImages(req: AuthenticatedRequest, res: Response) {
    const { type, id } = req.params;
    if (type !== 'lost' && type !== 'found') return res.status(400).json({ error: 'Invalid item type' });
    const result = await GetItemImagesHandler.execute(type as any, parseInt(id));
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ images: result.data });
  }
}
