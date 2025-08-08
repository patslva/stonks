import { NextResponse } from 'next/server'
import Redis from 'ioredis'

interface RedditComment {
  author: string
  body: string
  score: number
  created_utc: number
  permalink: string
}

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
  top_comments?: RedditComment[]
}

interface CacheData {
  posts: RedditPost[]
  daily_threads: RedditPost[]
  last_updated: string
  total_posts: number
}

async function fetchTopComments(permalink: string): Promise<RedditComment[]> {
  try {
    // Reddit API endpoint for post comments (remove leading slash and add .json)
    const commentsUrl = `https://www.reddit.com${permalink}.json?sort=top&limit=5`
    
    const response = await fetch(commentsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; stonks-app/1.0; +https://github.com/stonks-app)',
        'Accept': 'application/json',
      }
    })
    
    if (!response.ok) {
      console.log(`Failed to fetch comments for ${permalink}: ${response.status}`)
      return []
    }
    
    const data = await response.json()
    
    // Reddit returns an array: [post_data, comments_data]
    const commentsData = data[1]?.data?.children || []
    
    const topComments: RedditComment[] = []
    
    for (const comment of commentsData.slice(0, 5)) {
      const commentData = comment.data
      
      // Skip deleted comments and AutoModerator
      if (!commentData.body || commentData.body === '[deleted]' || commentData.author === 'AutoModerator') {
        continue
      }
      
      topComments.push({
        author: commentData.author,
        body: commentData.body.length > 200 ? commentData.body.substring(0, 200) + '...' : commentData.body,
        score: commentData.score,
        created_utc: commentData.created_utc,
        permalink: `https://reddit.com${commentData.permalink}`
      })
    }
    
    return topComments
    
  } catch (error) {
    console.error(`Error fetching comments for ${permalink}:`, error)
    return []
  }
}

export async function POST() {
  try {
    console.log("✅ Starting Reddit API fetch...")
    
    // Initialize Redis client
    const redis = new Redis(process.env.REDIS_URL!, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    })
    
    console.log("✅ Connected to Redis cache")
    
    // Fetch hot posts from r/wallstreetbets using Reddit API
    const response = await fetch('https://www.reddit.com/r/wallstreetbets/hot.json?limit=25', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; stonks-app/1.0; +https://github.com/stonks-app)',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Reddit API failed: ${response.status}`)
    }
    
    const redditData = await response.json()
    console.log("✅ Connected to Reddit API")
    
    const posts_data: RedditPost[] = []
    const daily_threads: RedditPost[] = []
    
    for (const item of redditData.data.children) {
      const post = item.data
      
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
      
      // Log all stickied posts to see what's available
      if (post.stickied) {
        console.log(`🔖 Stickied Post Found: "${post.title}"`)
      }
      
      // Separate daily discussion threads from regular posts
      // WSB rotates between "Daily Discussion Thread" (market hours) and "What Are Your Moves Tomorrow" (off hours)
      const title = post.title.toLowerCase()
      const isDailyThread = (
        // Market hours thread
        title.includes('daily discussion thread') ||
        // Off hours thread  
        title.includes('what are your moves tomorrow') ||
        title.includes('moves tomorrow') ||
        // Alternative patterns
        (title.includes('daily discussion') && title.includes('thread')) ||
        // AutoModerator posts with daily in title (common for these threads)
        (post.author === 'AutoModerator' && (title.includes('daily') || title.includes('moves tomorrow'))) ||
        // Date-based daily thread patterns
        title.match(/daily.*thread.*\d{1,2}[\/\-\.]\d{1,2}/i)
      )
      
      if (isDailyThread) {
        // Fetch top comments for daily threads
        console.log(`📌 Daily Thread Found: ${post.title.substring(0, 50)}... (comments: ${post.num_comments})`)
        console.log(`🔄 Fetching top comments for daily thread...`)
        
        const topComments = await fetchTopComments(post.permalink)
        post_data.top_comments = topComments
        
        console.log(`✅ Fetched ${topComments.length} top comments`)
        daily_threads.push(post_data)
      } else {
        posts_data.push(post_data)
        console.log(`📝 Regular Post: ${post.title.substring(0, 50)}... (score: ${post.score})`)
      }
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
      daily_threads: daily_threads,
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