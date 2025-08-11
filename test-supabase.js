import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: { persistSession: false }
  }
)

async function testSupabase() {
  console.log('🧪 Testing Supabase connection...')
  
  // Test data to insert
  const testData = {
    reddit_id: 'test_' + Date.now(),
    title: 'AAPL to the moon! 🚀 Test post from Node.js',
    author: 'testuser',
    score: 420
  }

  try {
    // 1. Insert test data
    console.log('📝 Inserting test data...')
    // First, let's see what tables exist
    console.log('🔍 Checking available tables...')
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (tables) {
      console.log('📋 Available tables:', tables.map(t => t.table_name))
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('reddit_posts')  // Try the suggested table name
      .insert(testData)
      .select()
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError)
      return
    }
    
    console.log('✅ Insert successful:', insertData)
    
    // 2. Query the data back
    console.log('📖 Fetching data from database...')
    const { data: selectData, error: selectError } = await supabase
      .from('reddit_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (selectError) {
      console.error('❌ Select failed:', selectError)
      return
    }
    
    console.log('✅ Found', selectData.length, 'posts:')
    selectData.forEach(post => {
      console.log(`  - ${post.title} (by u/${post.author}, score: ${post.score})`)
    })
    
    console.log('🎉 Supabase connection test completed successfully!')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

// Run the test
testSupabase()