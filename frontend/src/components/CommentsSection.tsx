import React, { useCallback, useEffect, useState } from 'react';
import { commentsService } from '../api/services/commentsService';
import { LoadingButton } from './LoadingButton';
import '../styles/components.css';
import { themedAlert, themedConfirm } from '../utils/themedDialog';

interface Comment {
  comment_id: number;
  content: string;
  user_email: string;
  created_at: string;
  user_id: number;
}

interface CommentsSectionProps {
  itemType: 'lost' | 'found';
  itemId: number;
  currentUserId?: number;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null) {
    const maybeResponse = (err as { response?: { data?: { error?: string } } }).response;
    const apiMessage = maybeResponse?.data?.error;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }
  }
  return fallback;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  itemType,
  itemId,
  currentUserId,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await commentsService.getComments(itemType, itemId);
      setComments(data.comments || []);
    } catch (err: unknown) {
      setError('Failed to load comments');
      console.error('Load comments error:', err);
    } finally {
      setLoading(false);
    }
  }, [itemId, itemType]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadComments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await commentsService.addComment(itemType, itemId, newComment.trim());
      setNewComment('');
      await loadComments(); // Reload comments
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to add comment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!(await themedConfirm('Are you sure you want to delete this comment?'))) return;

    try {
      await commentsService.deleteComment(commentId);
      await loadComments(); // Reload comments
    } catch (err: unknown) {
      await themedAlert(getErrorMessage(err, 'Failed to delete comment'));
    }
  };

  return (
    <div className="comments-section">
      <h3>Comments ({comments.length})</h3>

      {error && <div className="error-message">{error}</div>}

      {/* Comment List */}
      {loading ? (
        <div className="loading-message">Loading comments...</div>
      ) : comments.length === 0 ? (
        <p className="no-comments">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="comments-list">
          {comments.map((comment) => (
            <div key={comment.comment_id} className="comment">
              <div className="comment-header">
                <strong>{comment.user_email}</strong>
                <span className="comment-date">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="comment-content">{comment.content}</p>
              {currentUserId === comment.user_id && (
                <button
                  onClick={() => handleDelete(comment.comment_id)}
                  className="comment-delete"
                  aria-label="Delete comment"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          maxLength={500}
          rows={3}
          disabled={submitting}
        />
        <div className="comment-form-footer">
          <span className="char-count">
            {newComment.length}/500
          </span>
          <LoadingButton type="submit" loading={submitting}>
            Post Comment
          </LoadingButton>
        </div>
      </form>
    </div>
  );
};
