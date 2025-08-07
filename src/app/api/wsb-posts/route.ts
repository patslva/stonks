import Redis from 'ioredis'
import { NextRequest, NextResponse } from 'next/server'

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
}

interface CachedData {
  posts: WSBPost[]
  last_updated: string
  total_posts: number
}

export async function GET() {
  try {
    // Initialize Redis client
    const redis = new Redis(process.env.REDIS_URL!, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    })

    // Get cached WSB posts
    const cachedData = await redis.get('wsb:hot_posts')
    const lastUpdated = await redis.get('wsb:last_updated')

    if (!cachedData) {
      return NextResponse.json({ 
        error: 'No cached data available',
        message: 'Run the Python scraper first to populate cache'
      }, { status: 404 })
    }

    const data: CachedData = JSON.parse(cachedData)
    
    // Transform data for frontend
    const transformedPosts = data.posts.map(post => ({
      id: post.reddit_id,
      title: post.title,
      author: post.author,
      score: post.score,
      numComments: post.num_comments,
      url: post.url,
      permalink: post.permalink,
      createdAt: new Date(post.created_utc * 1000).toISOString(),
      subreddit: post.subreddit,
      // Add some basic analysis
      isHighEngagement: post.score > 1000 || post.num_comments > 100,
      sentiment: 'neutral' as const // Will be enhanced with AI later
    }))

    // Sort by score (most popular first)
    transformedPosts.sort((a, b) => b.score - a.score)

    // Close Redis connection
    redis.disconnect()

    return NextResponse.json({
      success: true,
      posts: transformedPosts,
      metadata: {
        totalPosts: transformedPosts.length,
        lastUpdated: lastUpdated || data.last_updated,
        highEngagementPosts: transformedPosts.filter(p => p.isHighEngagement).length,
        averageScore: Math.round(transformedPosts.reduce((sum, p) => sum + p.score, 0) / transformedPosts.length),
        topPost: transformedPosts[0]?.title.substring(0, 100) + '...' || null
      }
    })

  } catch (error) {
    console.error('Error fetching WSB posts:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch posts',
      message: 'Redis connection or data parsing failed'
    }, { status: 500 })
  }
}