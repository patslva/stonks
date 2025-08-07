'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)

  useEffect(() => {
    // Auto-refresh cache when home page loads
    refreshCache()
  }, [])

  const refreshCache = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/refresh-cache', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        setLastRefresh(new Date().toLocaleTimeString())
      }
    } catch (error) {
      console.error('Failed to refresh cache:', error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Stonks 📈
        </h1>
        <p className="text-xl text-center text-gray-600 mb-4">
          AI-powered stock analysis with Reddit sentiment
        </p>
        
        {refreshing ? (
          <div className="text-center mb-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Refreshing Reddit data...</p>
          </div>
        ) : lastRefresh ? (
          <p className="text-center text-sm text-green-600 mb-8">
            ✅ Data refreshed at {lastRefresh}
          </p>
        ) : null}
        
        <div className="text-center mb-8">
          <Link 
            href="/dashboard" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Dashboard →
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🤖 AI Analysis</h3>
            <p className="text-gray-600">OpenAI O3 powered buy/sell recommendations</p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">📊 Real-time Data</h3>
            <p className="text-gray-600">Live stock prices and earnings reports</p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">💬 Reddit Sentiment</h3>
            <p className="text-gray-600">r/wallstreetbets community insights</p>
          </div>
        </div>
      </div>
    </main>
  )
}