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

    // Get cached WSB posts and comments
    let cachedData = await redis.get('wsb:hot_posts')
    const cachedComments = await redis.get('wsb:daily_comments')
    const lastUpdated = await redis.get('wsb:last_updated')
    const commentsUpdated = await redis.get('wsb:comments_updated')

    if (!cachedData) {
      // Auto-refresh cache if missing
      try {
        const refreshResponse = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/refresh-cache`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (refreshResponse.ok) {
          // Wait a moment for Redis to update, then try again
          await new Promise(resolve => setTimeout(resolve, 1000))
          cachedData = await redis.get('wsb:hot_posts')
          
          if (!cachedData) {
            throw new Error('Cache refresh failed')
          }
        } else {
          throw new Error('Refresh API call failed')
        }
      } catch (error) {
        return NextResponse.json({ 
          error: 'No cached data available and auto-refresh failed',
          message: 'Please try refreshing the page or trigger cache refresh manually at /api/refresh-cache'
        }, { status: 503 })
      }
    }

    const data: CachedData = JSON.parse(cachedData)
    
    // Check if comments need refreshing (>4 hours old)
    const shouldRefreshComments = (() => {
      if (!commentsUpdated) return true; // No timestamp, need refresh
      
      const commentsAge = Date.now() - new Date(commentsUpdated).getTime();
      const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
      
      return commentsAge > fourHours;
    })();
    
    // Trigger background comment refresh if needed (non-blocking)
    if (shouldRefreshComments) {
      console.log('Comments are stale, triggering background refresh...');
      
      // Fire and forget - don't wait for response
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
      fetch(`${baseUrl}/api/refresh-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(error => {
        console.log('Background comment refresh failed:', error.message);
      });
    }
    
    // Parse cached comments if available
    let commentsData: WSBPost[] = []
    if (cachedComments) {
      try {
        commentsData = JSON.parse(cachedComments)
      } catch (error) {
        console.log('Failed to parse cached comments:', error)
      }
    }
    
    // Merge daily threads with their comments
    const mergedDailyThreads = data.daily_threads.map(thread => {
      // Find comments for this thread
      const threadWithComments = commentsData.find(ct => ct.reddit_id === thread.reddit_id)
      return {
        ...thread,
        top_comments: threadWithComments?.top_comments || thread.top_comments || []
      }
    })
    
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

    // Transform daily threads with merged comments
    const transformedThreads = mergedDailyThreads.map((thread, index) => ({
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
    return NextResponse.json({ 
      error: 'Failed to fetch posts',
      message: 'Redis connection or data parsing failed'
    }, { status: 500 })
  }
}