// app/markets/[id]/components/CommentsSection.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Comment } from './Comment'

interface CommentsSectionProps {
  marketId: string
}

export interface CommentType {
  id: string
  market_id: string
  user_id: string
  content: string
  likes_count: number
  created_at: string
  updated_at: string
  type: 'comment' | 'reply'
  parent_id?: string
  profiles: {
    username: string
    avatar_url: string | null
  }
  user_has_liked: boolean
  replies?: CommentType[]
  replies_count?: number
}

const COMMENTS_PER_PAGE = 10

export function CommentsSection({ marketId }: CommentsSectionProps) {
  const [comments, setComments] = useState<CommentType[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const supabase = createClient()

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  // Load comments using the new structure
  const loadComments = async (page: number = 1, loadMore: boolean = false) => {
    if (page === 1) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const from = (page - 1) * COMMENTS_PER_PAGE
      const to = from + COMMENTS_PER_PAGE - 1

      // Get comments with pagination
      const { data: commentsData, error, count } = await supabase
        .from('market_comments')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('market_id', marketId)
        .is('deleted_at', null)
        .is('parent_comment_id', null) // Only top-level comments
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      // Get all replies for these comments
      const commentIds = commentsData?.map(c => c.id) || []
      const { data: repliesData, error: repliesError } = await supabase
        .from('market_comment_reply')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          ),
          market_comments!inner(market_id)
        `)
        .eq('market_comments.market_id', marketId)
        .is('deleted_at', null)
        .in('comment_id', commentIds)
        .order('created_at', { ascending: true })

      if (repliesError) throw repliesError

      // Get user's likes for comments
      let userLikedCommentIds = new Set()
      let userLikedReplyIds = new Set()

      if (user) {
        const { data: commentLikes } = await supabase
          .from('market_comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentIds)

        const { data: replyLikes } = await supabase
          .from('market_comment_reply_likes')
          .select('reply_id')
          .eq('user_id', user.id)
          .in('reply_id', repliesData?.map(r => r.id) || [])

        userLikedCommentIds = new Set(commentLikes?.map(like => like.comment_id) || [])
        userLikedReplyIds = new Set(replyLikes?.map(like => like.reply_id) || [])
      }

      // Structure comments with replies
      const commentsWithReplies = commentsData?.map(comment => {
        const commentReplies = repliesData
          ?.filter(reply => reply.comment_id === comment.id)
          .map(reply => ({
            ...reply,
            type: 'reply' as const,
            parent_id: reply.comment_id,
            user_has_liked: userLikedReplyIds.has(reply.id),
            profiles: reply.profiles,
            likes_count: reply.likes_count || 0
          })) || []

        return {
          ...comment,
          type: 'comment' as const,
          user_has_liked: userLikedCommentIds.has(comment.id),
          replies: commentReplies,
          replies_count: commentReplies.length
        }
      }) || []

      if (loadMore) {
        setComments(prev => [...prev, ...commentsWithReplies])
      } else {
        setComments(commentsWithReplies)
      }

      // Check if there are more comments to load
      setHasMoreComments(commentsWithReplies.length === COMMENTS_PER_PAGE)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    loadComments(1)
  }, [marketId, user])

  // Real-time comments subscription
  useEffect(() => {
    const channel = supabase
      .channel(`market-comments-${marketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_comments',
          filter: `market_id=eq.${marketId}`
        },
        (payload) => {
          loadComments(1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_comment_reply',
        },
        (payload) => {
          loadComments(1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_comment_likes',
        },
        (payload) => {
          loadComments(1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_comment_reply_likes',
        },
        (payload) => {
          loadComments(1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [marketId, supabase])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('market_comments')
        .insert({
          market_id: marketId,
          user_id: user.id,
          content: newComment.trim(),
          parent_comment_id: null
        })

      if (error) throw error

      setNewComment('')
      // Reload comments to show the new one
      loadComments(1)
    } catch (error) {
      console.error('Error submitting comment:', error)
      alert('Failed to post comment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoadMore = () => {
    loadComments(currentPage + 1, true)
  }

  return (
    <div className="">
      <h2 className="text-xl font-semibold mb-6">Discussion ({comments.length})</h2>

      {/* Comment Input */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex space-x-4">
            <div className="flex-shrink-0">
              <img
                src={user.user_metadata?.avatar_url || '/default-avatar.jpg'}
                alt="Your avatar"
                className="w-10 h-10 rounded-full"
              />
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts on this market..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-500">
                  {newComment.length}/1000
                </span>
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center mb-6">
          <p className="text-yellow-700">
            Please sign in to join the discussion
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No comments yet. Be the first to start the discussion!</p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                marketId={marketId}
                currentUser={user}
                onCommentUpdate={() => loadComments(1)}
              />
            ))}
            
            {/* Load More Button */}
            {hasMoreComments && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <span>Load More Comments</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}