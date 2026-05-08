import { FiCornerUpRight, FiHeart, FiTrash2, FiX } from 'react-icons/fi';
import { FeedAvatarImage } from './FeedAvatarImage';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

export type ThreadedPostComment = {
  comment_id: number;
  content: string;
  user_id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string | null;
  created_at: string;
  parent_comment_id?: number | null;
  likes_count?: number | string;
  has_liked?: boolean;
};

type Props = {
  comments: ThreadedPostComment[];
  postOwnerId?: number;
  currentUserId?: number;
  canModerate?: boolean;
  isSpace?: boolean;
  replyTargetId?: number | null;
  replyValue?: string;
  onReplyTarget: (comment: ThreadedPostComment) => void;
  onReplyValueChange: (value: string) => void;
  onSubmitReply: (comment: ThreadedPostComment) => void;
  onCancelReply: () => void;
  onLike: (comment: ThreadedPostComment) => void;
  onDelete: (comment: ThreadedPostComment) => void;
  onNavigateProfile: (userId: number) => void;
  formatDate: (dateString: string) => string;
  getInitials: (firstName?: string, lastName?: string, email?: string) => string;
};

const countOf = (value: number | string | undefined) => {
  const n = Number.parseInt(String(value ?? '0'), 10);
  return Number.isFinite(n) ? n : 0;
};

export default function PostCommentList({
  comments,
  postOwnerId,
  currentUserId,
  canModerate,
  isSpace,
  replyTargetId,
  replyValue = '',
  onReplyTarget,
  onReplyValueChange,
  onSubmitReply,
  onCancelReply,
  onLike,
  onDelete,
  onNavigateProfile,
  formatDate,
  getInitials,
}: Props) {
  const topLevel = comments.filter((comment) => !comment.parent_comment_id);
  const repliesByParent = comments.reduce<Record<number, ThreadedPostComment[]>>((acc, comment) => {
    if (comment.parent_comment_id) {
      acc[comment.parent_comment_id] = [...(acc[comment.parent_comment_id] || []), comment];
    }
    return acc;
  }, {});

  const renderComment = (comment: ThreadedPostComment, depth = 0) => {
    const canDelete =
      currentUserId === comment.user_id ||
      currentUserId === postOwnerId ||
      Boolean(canModerate);
    const likesCount = countOf(comment.likes_count);

    return (
      <div key={comment.comment_id} className={depth ? 'ml-8 mt-3 border-l border-uv-border/60 pl-3' : ''}>
        <div className="flex gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => onNavigateProfile(comment.user_id)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[9px] font-black ${
              isSpace ? 'bg-white/10 text-white/80' : 'bg-gray-100 text-uv-gray'
            }`}
          >
            <FeedAvatarImage
              src={comment.avatar_url ? resolveMediaUrl(comment.avatar_url) : undefined}
              initials={getInitials(comment.first_name, comment.last_name, comment.email)}
              imgClassName="h-full w-full rounded-lg object-cover"
            />
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onNavigateProfile(comment.user_id)}
                className={`truncate text-left text-[11px] font-black transition-colors hover:text-primary md:text-xs ${
                  isSpace ? 'text-white' : 'text-uv-black'
                }`}
              >
                {comment.first_name} {comment.last_name}
              </button>
              <span className={`text-[8px] font-bold uppercase ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>
                {formatDate(comment.created_at)}
              </span>
            </div>
            <p className={`whitespace-pre-wrap text-[11px] font-medium leading-snug md:text-xs ${isSpace ? 'text-white/85' : 'text-uv-black'}`}>
              {comment.content}
            </p>
            <div className={`mt-1.5 flex items-center gap-3 text-[10px] font-black ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>
              <button
                type="button"
                onClick={() => onLike(comment)}
                className={`inline-flex items-center gap-1 transition-colors hover:text-pink-500 ${comment.has_liked ? 'text-pink-500' : ''}`}
              >
                <FiHeart size={12} className={comment.has_liked ? 'fill-current' : ''} />
                {likesCount}
              </button>
              <button
                type="button"
                onClick={() => onReplyTarget(comment)}
                className="inline-flex items-center gap-1 transition-colors hover:text-primary"
              >
                <FiCornerUpRight size={12} />
                Reply
              </button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(comment)}
                  className="inline-flex items-center gap-1 transition-colors hover:text-red-500"
                >
                  <FiTrash2 size={12} />
                  Delete
                </button>
              ) : null}
            </div>
            {replyTargetId === comment.comment_id ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  autoFocus
                  value={replyValue}
                  onChange={(event) => onReplyValueChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') onSubmitReply(comment);
                    if (event.key === 'Escape') onCancelReply();
                  }}
                  placeholder="Write a reply..."
                  className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary ${
                    isSpace ? 'border-white/10 bg-white/5 text-white placeholder:text-white/35' : 'border-uv-border bg-white text-uv-black'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => onSubmitReply(comment)}
                  className="rounded-xl bg-primary px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                  disabled={!replyValue.trim()}
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={onCancelReply}
                  className={`rounded-xl p-2 ${isSpace ? 'text-white/50 hover:bg-white/10' : 'text-uv-gray hover:bg-gray-100'}`}
                  aria-label="Cancel reply"
                >
                  <FiX size={14} />
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {(repliesByParent[comment.comment_id] || []).map((reply) => renderComment(reply, depth + 1))}
      </div>
    );
  };

  return <div className="space-y-3">{topLevel.map((comment) => renderComment(comment))}</div>;
}
