import apiClient from '../client';

interface LostItem {
  lost_item_id: number;
  lost_item_name: string;
  location?: string;
  description?: string;
  lost_date?: string;
  is_resolved: boolean;
}

interface SearchParams {
  searchTerm?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  isResolved?: boolean;
  limit?: number;
  offset?: number;
}

export const lostFoundService = {
  // Get all lost items
  getLostItems: (params?: SearchParams) =>
    apiClient.get<{ items: LostItem[]; total: number }>('/lost-items', { params }),

  // Get all found items
  getFoundItems: (params?: SearchParams) =>
    apiClient.get('/found-items', { params }),

  // Search lost items (full-text search)
  searchLostItems: (searchTerm: string) =>
    apiClient.post('/lost-items/search', { searchTerm }),

  // Search found items (full-text search)
  searchFoundItems: (searchTerm: string) =>
    apiClient.post('/found-items/search', { searchTerm }),

  // Create lost item with images
  createLostItem: (data: FormData) =>
    apiClient.post('/lost-items', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Create found item with images
  createFoundItem: (data: FormData) =>
    apiClient.post('/found-items', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Resolve lost item
  resolveLostItem: (id: number) =>
    apiClient.patch(`/lost-items/${id}/resolve`),

  // Resolve found item
  resolveFoundItem: (id: number) =>
    apiClient.patch(`/found-items/${id}/resolve`),

  // Get recent items (last 30 days)
  getRecentLostItems: () =>
    apiClient.get('/lost-items/recent'),

  getRecentFoundItems: () =>
    apiClient.get('/found-items/recent'),
};
