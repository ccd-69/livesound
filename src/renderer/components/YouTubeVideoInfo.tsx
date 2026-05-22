import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, ThumbsUp, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface Comment {
  id: string;
  author: string;
  authorImage: string;
  text: string;
  likeCount: number;
  publishedAt: string;
  replyCount: number;
}

interface VideoDetails {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

interface YouTubeVideoInfoProps {
  videoId: string;
}

export default function YouTubeVideoInfo({ videoId }: YouTubeVideoInfoProps) {
  const [details, setDetails] = useState<VideoDetails | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState('');
  const [descExpanded, setDescExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const dRes = await window.electronAPI.youtubeVideoDetails(videoId);
        if (cancelled) return;
        if (dRes.success && dRes.details) {
          setDetails(dRes.details);
        } else {
          setError(dRes.error || 'Failed to load video details');
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [videoId]);

  async function loadComments() {
    if (!videoId) return;
    setLoadingComments(true);
    setError('');
    try {
      const res = await window.electronAPI.youtubeVideoComments(videoId);
      if (res.success && res.comments) {
        setComments(res.comments);
      } else {
        setError(res.error || 'Failed to load comments');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  }

  function toggleComments() {
    if (!showComments && comments.length === 0) {
      loadComments();
    }
    setShowComments((prev) => !prev);
  }

  async function postComment() {
    if (!commentText.trim() || !videoId) return;
    setPosting(true);
    try {
      const res = await window.electronAPI.youtubePostComment(videoId, commentText.trim());
      if (res.success) {
        setCommentText('');
        // Refresh comments after posting
        loadComments();
      } else {
        setError(res.error || 'Failed to post comment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted py-2">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading video info...</span>
      </div>
    );
  }

  if (error) {
    const is403 = error.includes('403');
    return (
      <div className="flex flex-col gap-2 py-2">
        <p className="text-sm text-red-400">{error}</p>
        {is403 && (
          <p className="text-xs text-muted">
            You may need to reconnect YouTube in Settings for comment permissions to take effect.
          </p>
        )}
      </div>
    );
  }

  if (!details) return null;

  const shortDesc = details.description.slice(0, 200);
  const hasLongDesc = details.description.length > 200;

  return (
    <div className="w-full flex flex-col gap-3 text-text">
      {/* Description */}
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-muted uppercase">Description</p>
          <p className="text-xs text-muted">{Number(details.viewCount).toLocaleString()} views</p>
        </div>
        <div className="text-sm text-text/80 whitespace-pre-wrap leading-relaxed">
          {descExpanded || !hasLongDesc ? details.description : `${shortDesc}...`}
        </div>
        {hasLongDesc && (
          <button
            onClick={() => setDescExpanded((prev) => !prev)}
            className="mt-1 flex items-center gap-1 text-xs text-accent hover:underline"
          >
            {descExpanded ? (
              <>
                <ChevronUp size={14} /> Show less
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Show more
              </>
            )}
          </button>
        )}
      </div>

      {/* Comments toggle */}
      <button
        onClick={toggleComments}
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-hover"
      >
        <MessageSquare size={16} />
        Comments ({Number(details.commentCount).toLocaleString()})
        {showComments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-3 overflow-hidden"
          >
            {/* Comment input */}
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-xs font-semibold text-muted uppercase">Add a comment</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') postComment();
                  }}
                  placeholder="Share your thoughts..."
                  className="flex-1 rounded-lg border border-border bg-hover px-3 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-accent"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={postComment}
                  disabled={posting || !commentText.trim()}
                  className="flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {posting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Comments list */}
            {loadingComments ? (
              <div className="flex items-center gap-2 text-muted py-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading comments...</span>
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted py-2">No comments yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    {c.authorImage && (
                      <img
                        src={c.authorImage}
                        alt={c.author}
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    )}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text">{c.author}</span>
                        <span className="text-xs text-muted">{formatDate(c.publishedAt)}</span>
                      </div>
                      <p
                        className="text-sm text-text/80 leading-relaxed break-words"
                        dangerouslySetInnerHTML={{ __html: c.text }}
                      />
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <ThumbsUp size={12} />
                        <span>{c.likeCount.toLocaleString()}</span>
                        {c.replyCount > 0 && (
                          <span className="ml-2">{c.replyCount} replies</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
