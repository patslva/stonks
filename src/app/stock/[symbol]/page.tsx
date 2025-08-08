'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface StockData {
  c: number // current price
  d: number // change
  dp: number // percent change
  h: number // high
  l: number // low
  o: number // open
  pc: number // previous close
  t: number // timestamp
}

interface CompanyProfile {
  name: string
  ticker: string
  exchange: string
  ipo: string
  marketCapitalization: number
  shareOutstanding: number
  logo: string
  phone: string
  weburl: string
  finnhubIndustry: string
}

interface NewsItem {
  category: string
  datetime: number
  headline: string
  id: number
  image: string
  related: string
  source: string
  summary: string
  url: string
}

export default function StockPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = params.symbol as string
  
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!symbol) return
    fetchStockDetails()
  }, [symbol])

  const fetchStockDetails = async () => {
    setLoading(true)
    try {
      // Fetch stock quote, company profile, and news in parallel
      const [quoteRes, profileRes, newsRes] = await Promise.all([
        fetch(`/api/stock-data?symbol=${symbol}`),
        fetch(`/api/stock-data?symbol=${symbol}&type=profile`),
        fetch(`/api/stock-data?symbol=${symbol}&type=news`)
      ])

      if (quoteRes.ok) {
        const quoteData = await quoteRes.json()
        setStockData(quoteData)
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setCompanyProfile(profileData)
      }

      if (newsRes.ok) {
        const newsData = await newsRes.json()
        setNews(newsData.slice(0, 10)) // Show top 10 news items
      }

    } catch (err) {
      setError('Failed to fetch stock details')
      console.error('Error fetching stock details:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading {symbol?.toUpperCase()} details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !stockData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Stock Not Found</h1>
            <p className="text-gray-600 mb-8">Unable to load data for {symbol?.toUpperCase()}</p>
            <Link 
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Home
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {companyProfile?.logo && (
                <img 
                  src={companyProfile.logo} 
                  alt={`${symbol} logo`}
                  className="w-16 h-16 rounded-lg"
                />
              )}
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  {symbol?.toUpperCase()}
                </h1>
                {companyProfile?.name && (
                  <p className="text-xl text-gray-600">{companyProfile.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Price Section */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="text-5xl font-bold text-gray-900 mb-4">
                ${stockData.c?.toFixed(2) || 'N/A'}
              </div>
              <div className={`flex items-center text-lg ${
                (stockData.d || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <span className="mr-2">
                  {(stockData.d || 0) >= 0 ? '▲' : '▼'}
                </span>
                <span className="font-semibold">
                  {(stockData.d || 0) >= 0 ? '+' : ''}{stockData.d?.toFixed(2) || '0.00'} 
                  ({(stockData.dp || 0) >= 0 ? '+' : ''}{stockData.dp?.toFixed(2) || '0.00'}%)
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Open</p>
                <p className="text-lg font-semibold">${stockData.o?.toFixed(2) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">High</p>
                <p className="text-lg font-semibold">${stockData.h?.toFixed(2) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Low</p>
                <p className="text-lg font-semibold">${stockData.l?.toFixed(2) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Previous Close</p>
                <p className="text-lg font-semibold">${stockData.pc?.toFixed(2) || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Company Info */}
          {companyProfile && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Industry</p>
                    <p className="font-semibold">{companyProfile.finnhubIndustry || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Exchange</p>
                    <p className="font-semibold">{companyProfile.exchange || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">IPO Date</p>
                    <p className="font-semibold">{companyProfile.ipo || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Market Cap</p>
                    <p className="font-semibold">
                      ${(companyProfile.marketCapitalization / 1000).toFixed(2)}B
                    </p>
                  </div>
                </div>
                
                {companyProfile.weburl && (
                  <div className="mt-6">
                    <a 
                      href={companyProfile.weburl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-700"
                    >
                      Visit Company Website →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* News */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Latest News</h2>
              {news.length > 0 ? (
                <div className="space-y-4">
                  {news.slice(0, 5).map((article) => (
                    <div key={article.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                      <a 
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:bg-gray-50 p-2 rounded -m-2"
                      >
                        <h3 className="font-semibold text-sm text-gray-900 mb-2 line-clamp-2">
                          {article.headline}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{article.source}</span>
                          <span>{new Date(article.datetime * 1000).toLocaleDateString()}</span>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No news available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}