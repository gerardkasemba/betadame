// app/markets/[id]/components/MarketTrading.tsx
'use client'

import LiveGamesTicker from '@/components/LiveGamesTicker'
import { BinaryTrading } from './BinaryTrading'
import { SportsTrading } from './SportsTrading'
import { useState } from 'react'

interface MarketTradingProps {
  market: any
  marketType: 'binary' | 'sports'
  onSelectionChange?: (selection: any) => void
}

export function MarketTrading({ market, marketType }: MarketTradingProps) {
  const [copied, setCopied] = useState(false)

  const handleCommentClick = () => {
    // Scroll to comments section
    const commentsSection = document.getElementById('comments-section')
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link: ', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = window.location.href
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          {/* Comment Icon */}
          <button
            onClick={handleCommentClick}
            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-gray-50"
            title="Scroll to comments"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
              />
            </svg>
            <span className="text-sm font-medium">Discussion</span>
          </button>

          {/* Link Icon */}
          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors p-2 rounded-lg hover:bg-gray-50 relative"
            title="Copy link to market"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" 
              />
            </svg>
            <span className="text-sm font-medium">Share</span>
            
            {/* Copied Tooltip */}
            {copied && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                Link copied!
              </div>
            )}
          </button>
        </div>
      </div>
      
      {marketType === 'binary' ? (
        <BinaryTrading market={market} />
      ) : (
        <>
        <SportsTrading market={market} />
        </>
      )}
    </div>
  )
}