import { NextResponse } from 'next/server'

// Simple logger utility
const log = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || '')
}

async function testRedditOAuth(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    log.info('Testing Reddit OAuth token acquisition...')
    
    // Check environment variables
    const clientId = process.env.REDDIT_CLIENT_ID
    const clientSecret = process.env.REDDIT_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      return {
        success: false,
        message: 'Missing Reddit credentials in environment variables',
        details: {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret
        }
      }
    }
    
    log.info('Environment variables found, attempting OAuth...')
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'web:stonks-app:v1.0.0 (by /u/DueIndividual6973)',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials&scope=read'
    })

    const responseText = await response.text()
    log.info(`Reddit OAuth response status: ${response.status}`)
    
    if (!response.ok) {
      return {
        success: false,
        message: `Reddit OAuth failed with status ${response.status}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          responseBody: responseText,
          headers: Object.fromEntries(response.headers.entries())
        }
      }
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      return {
        success: false,
        message: 'Failed to parse Reddit OAuth response as JSON',
        details: {
          responseBody: responseText,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        }
      }
    }
    
    if (data.access_token) {
      log.info('Reddit OAuth token obtained successfully!')
      return {
        success: true,
        message: 'Reddit OAuth token obtained successfully',
        details: {
          tokenType: data.token_type,
          expiresIn: data.expires_in,
          scope: data.scope,
          tokenLength: data.access_token?.length
        }
      }
    } else {
      return {
        success: false,
        message: 'No access token in Reddit OAuth response',
        details: data
      }
    }
    
  } catch (error: any) {
    log.error('OAuth test failed with error:', error.message)
    return {
      success: false,
      message: 'OAuth test failed with error',
      details: {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name
      }
    }
  }
}

export async function GET() {
  const result = await testRedditOAuth()
  
  return NextResponse.json(result, { 
    status: result.success ? 200 : 500 
  })
}