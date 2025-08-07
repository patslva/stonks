import json
import os
import praw
import redis
from datetime import datetime

def handler(request):
    try:
        # Initialize Reddit client (read-only)
        reddit = praw.Reddit(
            client_id=os.environ['REDDIT_CLIENT_ID'],
            client_secret=os.environ['REDDIT_CLIENT_SECRET'],
            user_agent='stonks-app:v1.0'
        )
        
        print("✅ Connected to Reddit API")
        
        # Initialize Redis client using the Redis protocol URL
        redis_client = redis.from_url(
            os.environ['REDIS_URL'],  # This is the rediss:// URL
            decode_responses=True  # Automatically decode bytes to strings
        )
        
        print("✅ Connected to Redis cache")
        
        # Fetch hot posts from r/wallstreetbets
        subreddit = reddit.subreddit("wallstreetbets")
        hot_posts = subreddit.hot(limit=25)  # Get top 25 hot posts
        
        posts_data = []
        
        for post in hot_posts:
            # Skip pinned/stickied posts (usually rules/daily threads)
            if post.stickied:
                continue
            
            # Prepare post data for cache
            post_data = {
                'reddit_id': post.id,
                'title': post.title[:500] if len(post.title) > 500 else post.title,
                'author': str(post.author) if post.author else '[deleted]',
                'score': post.score,
                'num_comments': post.num_comments,
                'url': post.url,
                'permalink': f"https://reddit.com{post.permalink}",
                'created_utc': post.created_utc,
                'subreddit': 'wallstreetbets'
            }
            
            posts_data.append(post_data)
            print(f"📝 Prepared: {post.title[:50]}... (score: {post.score})")
        
        if not posts_data:
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'success': True,
                    'message': 'No new posts to process',
                    'posts_processed': 0
                })
            }
        
        # Store in Redis cache with 15-minute expiration
        cache_data = {
            'posts': posts_data,
            'last_updated': datetime.utcnow().isoformat(),
            'total_posts': len(posts_data)
        }
        
        # Store with 15-minute TTL (900 seconds)
        redis_client.setex(
            'wsb:hot_posts', 
            900,  # 15 minutes
            json.dumps(cache_data)
        )
        
        # Store metadata
        redis_client.setex(
            'wsb:last_updated',
            900,
            datetime.utcnow().isoformat()
        )
        
        print(f"✅ Successfully cached {len(posts_data)} posts in Redis")
        print(f"🕒 Cache expires in 15 minutes")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'posts_processed': len(posts_data),
                'cached_until': (datetime.utcnow().timestamp() + 900),
                'sample_titles': [post['title'][:100] for post in posts_data[:3]],
                'message': f'Successfully fetched and cached {len(posts_data)} WSB posts',
                'cache_key': 'wsb:hot_posts'
            })
        }
        
    except redis.RedisError as e:
        print(f"❌ Redis Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'success': False,
                'error': f'Redis connection failed: {str(e)}'
            })
        }
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }

# For local testing
if __name__ == '__main__':
    # Load environment variables for local testing
    from dotenv import load_dotenv
    load_dotenv('../../.env.local')  # Go up two directories to find .env.local
    
    # Run the function
    result = handler(None)
    print(json.dumps(json.loads(result['body']), indent=2))