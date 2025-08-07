import json
import requests
import os
from datetime import datetime
from supabase import create_client

def handler(request):
    try:
        # Fetch data from Tradestie API (free!)
        response = requests.get('https://tradestie.com/api/v1/apps/reddit')
        
        if response.status_code != 200:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Failed to fetch Reddit data'})
            }
        
        reddit_data = response.json()
        
        # Process the data for your database
        processed_data = []
        for stock in reddit_data:
            processed_data.append({
                'symbol': stock['ticker'],
                'sentiment_score': stock['sentiment_score'],
                'sentiment_label': stock['sentiment'], # "Bullish" or "Bearish"
                'mention_count': stock['no_of_comments'],
                'source': 'wallstreetbets',
                'timestamp': datetime.now().isoformat(),
                'raw_data': stock  # Store full response
            })
        
        # Store in Supabase
        supabase = create_client(
            os.environ['NEXT_PUBLIC_SUPABASE_URL'],
            os.environ['SUPABASE_SERVICE_KEY']
        )
        
        # Insert into reddit_sentiment table
        result = supabase.table('reddit_sentiment').insert(processed_data).execute()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'processed_stocks': len(processed_data),
                'top_stocks': processed_data[:5]  # Return top 5 for verification
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }