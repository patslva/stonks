'use client'

import { useEffect, useState } from 'react'

interface WSBPost {
  id: string
  title: string
  author: string
  score: number
  numComments: number
  url: string
  permalink: string
  createdAt: string
  subreddit: string
  isHighEngagement: boolean
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

interface PostsResponse {
  success: boolean
  posts: WSBPost[]
  metadata: {
    totalPosts: number
    lastUpdated: string
    highEngagementPosts: number
    averageScore: number
    topPost: string | null
  }
}

export default function Dashboard() {
  const [posts, setPosts] = useState<WSBPost[]>([])
  const [metadata, setMetadata] = useState<PostsResponse['metadata'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/wsb-posts')
      const data: PostsResponse = await response.json()
      
      if (data.success) {
        setPosts(data.posts)
        setMetadata(data.metadata)
        setLastRefresh(new Date())
        setError(null)
      } else {
        setError('Failed to fetch posts')
      }
    } catch (err) {
      setError('Error loading posts')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchPosts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatScore = (score: number) => {
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}k`
    }
    return score.toString()
  }

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return '🚀'
      case 'bearish': return '📉'
      default: return '😐'
    }
  }

  const getEngagementBadge = (post: WSBPost) => {
    if (post.score > 5000) return { text: 'VIRAL', color: 'bg-red-500' }
    if (post.score > 2000) return { text: 'HOT', color: 'bg-orange-500' }
    if (post.score > 1000) return { text: 'POPULAR', color: 'bg-yellow-500' }
    if (post.isHighEngagement) return { text: 'TRENDING', color: 'bg-blue-500' }
    return null
  }

  if (loading && !posts.length) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            📊 WSB Dashboard
          </h1>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading WSB posts...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !posts.length) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            📊 WSB Dashboard
          </h1>
          <div className="text-center py-12">
            <p className="text-red-600 text-lg">{error}</p>
            <button 
              onClick={fetchPosts}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              📊 r/wallstreetbets Live Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time sentiment and trends from the WSB community
            </p>
          </div>
          <button 
            onClick={fetchPosts}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>

        {/* Stats */}
        {metadata && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{metadata.totalPosts}</div>
              <div className="text-sm text-gray-600">Total Posts</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600">{metadata.highEngagementPosts}</div>
              <div className="text-sm text-gray-600">High Engagement</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{formatScore(metadata.averageScore)}</div>
              <div className="text-sm text-gray-600">Avg Score</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-orange-600">
                {lastRefresh ? formatDate(lastRefresh.toISOString()) : 'Never'}
              </div>
              <div className="text-sm text-gray-600">Last Refresh</div>
            </div>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-4">
          {posts.map((post, index) => {
            const badge = getEngagementBadge(post)
            return (
              <div key={post.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-2xl font-bold text-gray-400 min-w-[40px]">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">
                        {getSentimentEmoji(post.sentiment)} {post.title}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span>👤 u/{post.author}</span>
                        <span>🕒 {formatDate(post.createdAt)}</span>
                        {badge && (
                          <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${badge.color}`}>
                            {badge.text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 ml-4">
                    <span className="flex items-center gap-1 bg-orange-100 px-3 py-1 rounded-full">
                      ⬆️ {formatScore(post.score)}
                    </span>
                    <span className="flex items-center gap-1 bg-blue-100 px-3 py-1 rounded-full">
                      💬 {post.numComments}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <a 
                    href={post.permalink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm"
                  >
                    Reddit 🔗
                  </a>
                  {post.url !== post.permalink && (
                    <a 
                      href={post.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                    >
                      Link 🔗
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {posts.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No posts found</p>
            <p className="text-gray-400 mt-2">Run the Python scraper to populate cache</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Data updates every 15 minutes • Dashboard auto-refreshes every 5 minutes</p>
          {metadata?.lastUpdated && (
            <p>Cache last updated: {formatDate(metadata.lastUpdated)}</p>
          )}
        </div>
      </div>
    </div>
  )
}