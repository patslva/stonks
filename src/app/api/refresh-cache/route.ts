import { NextResponse } from 'next/server'
import Redis from 'ioredis'

interface RedditPost {
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

interface CacheData {
  posts: RedditPost[]
  last_updated: string
  total_posts: number
}

export async function POST() {
  try {
    console.log("✅ Starting Reddit API fetch...")
    
    // Initialize Redis client
    const redis = new Redis(process.env.REDIS_URL!, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    })
    
    console.log("✅ Connected to Redis cache")
    
    // Fetch hot posts from r/wallstreetbets using Reddit API
    const response = await fetch('https://www.reddit.com/r/wallstreetbets/hot.json?limit=25', {
      headers: {
        'User-Agent': 'stonks-app:v1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Reddit API failed: ${response.status}`)
    }
    
    const redditData = await response.json()
    console.log("✅ Connected to Reddit API")
    
    const posts_data: RedditPost[] = []
    
    for (const item of redditData.data.children) {
      const post = item.data
      
      // Skip pinned/stickied posts (usually rules/daily threads)
      if (post.stickied) {
        continue
      }
      
      // Prepare post data for cache
      const post_data: RedditPost = {
        reddit_id: post.id,
        title: post.title.length > 500 ? post.title.substring(0, 500) : post.title,
        author: post.author || '[deleted]',
        score: post.score,
        num_comments: post.num_comments,
        url: post.url,
        permalink: `https://reddit.com${post.permalink}`,
        created_utc: post.created_utc,
        subreddit: 'wallstreetbets'
      }
      
      posts_data.push(post_data)
      console.log(`📝 Prepared: ${post.title.substring(0, 50)}... (score: ${post.score})`)
    }
    
    if (posts_data.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new posts to process',
        posts_processed: 0
      })
    }
    
    // Store in Redis cache with 24-hour expiration (for cron setup)
    const cache_data: CacheData = {
      posts: posts_data,
      last_updated: new Date().toISOString(),
      total_posts: posts_data.length
    }
    
    // Store with 24-hour TTL (86400 seconds) for daily cron
    await redis.setex(
      'wsb:hot_posts',
      86400,  // 24 hours
      JSON.stringify(cache_data)
    )
    
    // Store metadata
    await redis.setex(
      'wsb:last_updated',
      86400,
      new Date().toISOString()
    )
    
    // Close Redis connection
    redis.disconnect()
    
    console.log(`✅ Successfully cached ${posts_data.length} posts in Redis`)
    console.log(`🕒 Cache expires in 24 hours`)
    
    return NextResponse.json({
      success: true,
      posts_processed: posts_data.length,
      cached_until: Date.now() + (86400 * 1000),
      sample_titles: posts_data.slice(0, 3).map(post => post.title.substring(0, 100)),
      message: `Successfully fetched and cached ${posts_data.length} WSB posts`,
      cache_key: 'wsb:hot_posts'
    })
    
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
    
    if (error.message?.includes('Redis')) {
      return NextResponse.json({
        success: false,
        error: `Redis connection failed: ${error.message}`
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}