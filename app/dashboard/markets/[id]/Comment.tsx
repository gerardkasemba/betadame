// app/markets/[id]/components/Comment.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CommentType } from './CommentsSection'

interface CommentProps {
  comment: CommentType
  marketId: string
  currentUser: any
  onCommentUpdate: () => void
}

const REPLIES_PER_PAGE = 3

export function Comment({ comment, marketId, currentUser, onCommentUpdate }: CommentProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [repliesPage, setRepliesPage] = useState(1)
  const [showAllReplies, setShowAllReplies] = useState(false)
  const supabase = createClient()

  // Calculate displayed replies based on pagination
  const totalReplies = comment.replies_count || (comment.replies ? comment.replies.length : 0)
  const allReplies = comment.replies || []
  
  const getDisplayedReplies = () => {
    if (showAllReplies) {
      return allReplies
    }
    return allReplies.slice(0, REPLIES_PER_PAGE * repliesPage)
  }

  const displayedReplies = getDisplayedReplies()
  const hasMoreReplies = displayedReplies.length < totalReplies
  const canLoadMore = repliesPage * REPLIES_PER_PAGE < totalReplies

  const handleLike = async (isReply: boolean = false, replyId?: string) => {
    if (!currentUser) {
      alert('Please sign in to like comments')
      return
    }

    setIsLiking(true)
    try {
      if (isReply && replyId) {
        // Handle reply like
        const reply = allReplies.find(r => r.id === replyId)
        if (reply?.user_has_liked) {
          await supabase
            .from('market_comment_reply_likes')
            .delete()
            .eq('reply_id', replyId)
            .eq('user_id', currentUser.id)
        } else {
          await supabase
            .from('market_comment_reply_likes')
            .insert({
              reply_id: replyId,
              user_id: currentUser.id
            })
        }
      } else {
        // Handle comment like
        if (comment.user_has_liked) {
          await supabase
            .from('market_comment_likes')
            .delete()
            .eq('comment_id', comment.id)
            .eq('user_id', currentUser.id)
        } else {
          await supabase
            .from('market_comment_likes')
            .insert({
              comment_id: comment.id,
              user_id: currentUser.id
            })
        }
      }
      onCommentUpdate() // Refresh to update like counts
    } catch (error) {
      console.error('Error updating like:', error)
    } finally {
      setIsLiking(false)
    }
  }

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || !currentUser) return

    setIsSubmittingReply(true)
    try {
      const { error } = await supabase
        .from('market_comment_reply')
        .insert({
          comment_id: comment.id,
          user_id: currentUser.id,
          content: replyContent.trim()
        })

      if (error) throw error

      setReplyContent('')
      setIsReplying(false)
      onCommentUpdate() // Refresh to show new reply
    } catch (error) {
      console.error('Error submitting reply:', error)
      alert('Failed to post reply. Please try again.')
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const handleLoadMoreReplies = () => {
    setRepliesPage(prev => prev + 1)
  }

  const handleViewAllReplies = () => {
    setShowAllReplies(true)
  }

  const handleViewLessReplies = () => {
    setShowAllReplies(false)
    setRepliesPage(1)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Main Comment */}
      <div className="p-4">
        <div className="flex space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <img
              src={comment.profiles.avatar_url || '/default-avatar.jpg'}
              alt={comment.profiles.username}
              className="w-8 h-8 rounded-full"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-gray-900 text-sm">
                {comment.profiles.username}
              </span>
              <span className="text-gray-500 text-sm">
                {formatTimeAgo(comment.created_at)}
              </span>
            </div>

            {/* Comment Text */}
            <p className="text-gray-900 text-sm mb-2 whitespace-pre-wrap">
              {comment.content}
            </p>

            {/* Actions */}
            <div className="flex items-center space-x-4 text-sm">
              <button
                onClick={() => handleLike(false)}
                disabled={isLiking || !currentUser}
                className={`flex items-center space-x-1 transition-colors ${
                  comment.user_has_liked 
                    ? 'text-red-600 hover:text-red-700' 
                    : 'text-gray-500 hover:text-gray-700'
                } disabled:opacity-50`}
              >
                <svg 
                  className={`w-4 h-4 ${comment.user_has_liked ? 'fill-current' : ''}`} 
                  stroke="currentColor" 
                  fill={comment.user_has_liked ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{comment.likes_count}</span>
              </button>

              <button
                onClick={() => setIsReplying(!isReplying)}
                disabled={!currentUser}
                className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                Reply
              </button>

              {/* Reply count indicator */}
              {totalReplies > 0 && (
                <span className="text-gray-500 text-sm">
                  {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reply Form */}
        {isReplying && currentUser && (
          <form onSubmit={handleSubmitReply} className="mt-4 ml-11">
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                <img
                  src={currentUser.user_metadata?.avatar_url || '/default-avatar.jpg'}
                  alt="Your avatar"
                  className="w-8 h-8 rounded-full"
                />
              </div>
              <div className="flex-1">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                  rows={2}
                  maxLength={500}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {replyContent.length}/500
                  </span>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsReplying(false)}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!replyContent.trim() || isSubmittingReply}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingReply ? 'Posting...' : 'Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Replies */}
      {displayedReplies.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 rounded-b-lg">
          {displayedReplies.map((reply) => (
            <div key={reply.id} className="p-4 border-b border-gray-100 last:border-b-0">
              <div className="flex space-x-3">
                <div className="flex-shrink-0">
                  <img
                    src={reply.profiles.avatar_url || '/default-avatar.jpg'}
                    alt={reply.profiles.username}
                    className="w-6 h-6 rounded-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {reply.profiles.username}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {formatTimeAgo(reply.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-900 text-sm whitespace-pre-wrap">
                    {reply.content}
                  </p>
                  <div className="flex items-center space-x-4 text-sm mt-1">
                    <button
                      onClick={() => handleLike(true, reply.id)}
                      disabled={isLiking || !currentUser}
                      className={`flex items-center space-x-1 transition-colors ${
                        reply.user_has_liked 
                          ? 'text-red-600 hover:text-red-700' 
                          : 'text-gray-500 hover:text-gray-700'
                      } disabled:opacity-50`}
                    >
                      <svg 
                        className={`w-3 h-3 ${reply.user_has_liked ? 'fill-current' : ''}`} 
                        stroke="currentColor" 
                        fill={reply.user_has_liked ? 'currentColor' : 'none'}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span className="text-xs">{reply.likes_count}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Replies Pagination Controls */}
          {totalReplies > REPLIES_PER_PAGE && (
            <div className="p-3 border-t border-gray-200">
              <div className="flex justify-center">
                {showAllReplies ? (
                  <button
                    onClick={handleViewLessReplies}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                  >
                    View less replies
                  </button>
                ) : hasMoreReplies ? (
                  <div className="flex flex-col items-center space-y-2">
                    <button
                      onClick={handleLoadMoreReplies}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                    >
                      Load more replies ({totalReplies - displayedReplies.length} remaining)
                    </button>
                    {totalReplies > REPLIES_PER_PAGE * 2 && (
                      <button
                        onClick={handleViewAllReplies}
                        className="text-blue-500 hover:text-blue-700 text-xs transition-colors"
                      >
                        View all {totalReplies} replies
                      </button>
                    )}
                  </div>
                ) : canLoadMore ? (
                  <button
                    onClick={handleLoadMoreReplies}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                  >
                    Load more replies
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}