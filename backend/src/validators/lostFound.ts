import { z } from 'zod';

export const createLostItemSchema = z.object({
  lostItemName: z.string().min(1, 'Item name is required'),
  location: z.string().min(1, 'Location is required'),
  description: z.string().optional(),
  lostDate: z.string().datetime().optional().or(z.date().optional()),
});

export const createFoundItemSchema = z.object({
  foundItemName: z.string().min(1, 'Item name is required'),
  location: z.string().min(1, 'Location is required'),
  description: z.string().optional(),
  foundDate: z.string().datetime().optional().or(z.date().optional()),
});

export const lostItemsQuerySchema = z.object({
  location: z.string().optional(),
  isResolved: z.coerce.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const foundItemsQuerySchema = z.object({
  location: z.string().optional(),
  isResolved: z.coerce.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const resolveItemParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateLostItemRequest = z.infer<typeof createLostItemSchema>;
export type CreateFoundItemRequest = z.infer<typeof createFoundItemSchema>;
export type LostItemsQuery = z.infer<typeof lostItemsQuerySchema>;
export type FoundItemsQuery = z.infer<typeof foundItemsQuerySchema>;
export type ResolveItemParams = z.infer<typeof resolveItemParamsSchema>;


