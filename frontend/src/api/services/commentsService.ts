import apiClient from '../client';

interface Comment {
  comment_id: number;
  content: string;
  user_email: string;
  created_at: string;
  user_id: number;
}

export const commentsService = {
  /**
   * Get all comments for an item
   */
  getComments: (type: 'lost' | 'found', itemId: number) =>
    apiClient.get<{ comments: Comment[] }>(`/items/${type}/${itemId}/comments`),

  /**
   * Add a comment to an item
   */
  addComment: (type: 'lost' | 'found', itemId: number, content: string) =>
    apiClient.post(`/items/${type}/${itemId}/comments`, { content }),

  /**
   * Delete a comment (own comment or admin)
   */
  deleteComment: (commentId: number) =>
    apiClient.delete(`/items/comments/${commentId}`),
};
