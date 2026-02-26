import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { LostFoundService } from '../services/lostFoundService.js';
import { AppError } from '../middleware/errorHandler.js';
import type {
  CreateLostItemRequest,
  CreateFoundItemRequest,
  LostItemsQuery,
  FoundItemsQuery,
  ResolveItemParams,
} from '../validators/lostFound.js';

export class LostFoundController {
  static async createLostItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = req.body as CreateLostItemRequest;
      const files = (req.files as Express.Multer.File[]) || [];
      const imageUrls = files.map(file => `/uploads/${file.filename}`);

      const item = await LostFoundService.createLostItem(req.userId, data, imageUrls);

      res.status(201).json({
        message: 'Lost item created successfully',
        item,
      });
    } catch (error) {
      console.error('Create lost item error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to create lost item' });
    }
  }

  static async createFoundItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = req.body as CreateFoundItemRequest;
      const files = (req.files as Express.Multer.File[]) || [];
      const imageUrls = files.map(file => `/uploads/${file.filename}`);

      const item = await LostFoundService.createFoundItem(req.userId, data, imageUrls);

      res.status(201).json({
        message: 'Found item created successfully',
        item,
      });
    } catch (error) {
      console.error('Create found item error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to create found item' });
    }
  }

  static async getLostItems(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryParams = req.query as unknown as LostItemsQuery;
      const result = await LostFoundService.getLostItems(queryParams);

      res.json({
        total: result.total,
        limit: queryParams.limit || 50,
        offset: queryParams.offset || 0,
        items: result.items,
      });
    } catch (error) {
      console.error('Get lost items error:', error);
      res.status(500).json({ error: 'Failed to fetch lost items' });
    }
  }

  static async getFoundItems(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryParams = req.query as unknown as FoundItemsQuery;
      const result = await LostFoundService.getFoundItems(queryParams);

      res.json({
        total: result.total,
        limit: queryParams.limit || 50,
        offset: queryParams.offset || 0,
        items: result.items,
      });
    } catch (error) {
      console.error('Get found items error:', error);
      res.status(500).json({ error: 'Failed to fetch found items' });
    }
  }

  static async resolveLostItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params as ResolveItemParams;
      await LostFoundService.resolveLostItem(id, req.userId);

      res.json({
        message: 'Lost item resolved successfully',
      });
    } catch (error) {
      console.error('Resolve lost item error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to resolve lost item' });
    }
  }

  static async resolveFoundItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params as ResolveItemParams;
      await LostFoundService.resolveFoundItem(id, req.userId);

      res.json({
        message: 'Found item resolved successfully',
      });
    } catch (error) {
      console.error('Resolve found item error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to resolve found item' });
    }
  }

  static async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { type, id } = req.params;
      const { content } = req.body;

      if (!content) {
        res.status(400).json({ error: 'Comment content is required' });
        return;
      }

      if (type !== 'lost' && type !== 'found') {
        res.status(400).json({ error: 'Invalid item type' });
        return;
      }

      await LostFoundService.addComment(req.userId, type as 'lost' | 'found', parseInt(id), content);

      res.status(201).json({ message: 'Comment added successfully' });
    } catch (error) {
      console.error('Add comment error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to add comment' });
    }
  }

  static async getComments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, id } = req.params;

      if (type !== 'lost' && type !== 'found') {
        res.status(400).json({ error: 'Invalid item type' });
        return;
      }

      const comments = await LostFoundService.getComments(type as 'lost' | 'found', parseInt(id));

      res.json(comments);
    } catch (error) {
      console.error('Get comments error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }

  static async getItemImages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, id } = req.params;

      if (type !== 'lost' && type !== 'found') {
        res.status(400).json({ error: 'Invalid item type' });
        return;
      }

      const images = await LostFoundService.getItemImages(type as 'lost' | 'found', parseInt(id));

      res.json({ images });
    } catch (error) {
      console.error('Get item images error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to fetch images' });
    }
  }
}
