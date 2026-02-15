import { z } from 'zod';

/**
 * Create Lost Item Schema
 */
export const createLostItemSchema = z.object({
  lost_item_name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name too long'),
  location: z.string().min(2, 'Location must be at least 2 characters').max(200, 'Location too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  lost_date: z.string().datetime().optional(),
});

/**
 * Create Found Item Schema
 */
export const createFoundItemSchema = z.object({
  found_item_name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name too long'),
  location: z.string().min(2, 'Location must be at least 2 characters').max(200, 'Location too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  found_date: z.string().datetime().optional(),
});

/**
 * Search Items Schema
 */
export const searchItemsSchema = z.object({
  searchTerm: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  isResolved: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type CreateLostItemInput = z.infer<typeof createLostItemSchema>;
export type CreateFoundItemInput = z.infer<typeof createFoundItemSchema>;
export type SearchItemsInput = z.infer<typeof searchItemsSchema>;
