import Redis from 'ioredis'
import { NextRequest, NextResponse } from 'next/server'

interface RedditComment {
  author: string
  body: string
  score: number
  created_utc: number
  permalink: string
}

interface WSBPost {
  reddit_id: string
  title: string
  author: string
  score: number
  num_comments: number
  url: string
  permalink: string
  created_utc: number
  subreddit: string
  top_comments?: RedditComment[]
}

interface CachedData {
  posts: WSBPost[]
  daily_threads: WSBPost[]
  last_updated: string
  total_posts: number
}

export async function GET() {
  try {
    // Initialize Redis client
    const redis = new Redis(process.env.REDIS_URL!, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    })

    // Get cached WSB posts
    const cachedData = await redis.get('wsb:hot_posts')
    const lastUpdated = await redis.get('wsb:last_updated')

    if (!cachedData) {
      return NextResponse.json({ 
        error: 'No cached data available',
        message: 'Trigger cache refresh first at /api/refresh-cache'
      }, { status: 404 })
    }

    const data: CachedData = JSON.parse(cachedData)
    
    // Transform regular posts for frontend
    const transformedPosts = data.posts.map((post, index) => ({
      id: post.reddit_id,
      title: post.title,
      author: post.author,
      createdAt: new Date(post.created_utc * 1000).toISOString(),
      flair: post.score > 5000 ? 'VIRAL' : post.score > 2000 ? 'HOT' : post.score > 1000 ? 'POPULAR' : 'NEW',
      score: post.score,
      comments: post.num_comments,
      rank: index + 1,
      url: post.permalink,
      externalUrl: post.url !== post.permalink ? post.url : undefined,
      sentiment: 'neutral' as const
    }))

    // Transform daily threads
    const transformedThreads = (data.daily_threads || []).map((thread, index) => ({
      id: thread.reddit_id,
      title: thread.title,
      author: thread.author,
      createdAt: new Date(thread.created_utc * 1000).toISOString(),
      flair: 'DAILY' as const,
      score: thread.score,
      comments: thread.num_comments,
      rank: index + 1,
      url: thread.permalink,
      externalUrl: thread.url !== thread.permalink ? thread.url : undefined,
      sentiment: 'neutral' as const,
      top_comments: thread.top_comments || []
    }))

    // Sort by score (most popular first)
    transformedPosts.sort((a, b) => b.score - a.score)

    // Close Redis connection
    redis.disconnect()

    return NextResponse.json({
      posts: transformedPosts,
      daily_threads: transformedThreads
    })

  } catch (error) {
    console.error('Error fetching WSB posts:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch posts',
      message: 'Redis connection or data parsing failed'
    }, { status: 500 })
  }
}