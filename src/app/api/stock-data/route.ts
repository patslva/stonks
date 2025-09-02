import { NextRequest, NextResponse } from 'next/server'
import { DefaultApi, Configuration } from 'finnhub-ts'
import axios from 'axios'

const initializeFinnhubClient = () => {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY not found in environment variables');
  }

  const configuration = new Configuration({
    apiKey: apiKey
  });

  return new DefaultApi(configuration);
}

const getQuote = async (symbol: string) => {
  const finnhubClient = initializeFinnhubClient();
  const response = await finnhubClient.quote(symbol);
  return response.data;
}

const getCompanyProfile = async (symbol: string) => {
  const finnhubClient = initializeFinnhubClient();
  const response = await finnhubClient.companyProfile2(symbol);
  return response.data;
}

const getCompanyNews = async (symbol: string) => {
  const finnhubClient = initializeFinnhubClient();
  
  // Get news for the last 30 days
  const to = Math.floor(Date.now() / 1000);
  const from = to - (30 * 24 * 60 * 60); // 30 days ago
  
  const response = await finnhubClient.companyNews(symbol, from.toString(), to.toString());
  return response.data;
}

const getMarketNews = async () => {
  const finnhubClient = initializeFinnhubClient();
  
  // Get general market news
  const response = await finnhubClient.marketNews('general');
  return response.data;
}

const getHistoricalCandles = async (symbol: string, resolution: string = 'D', days: number = 30) => {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY not found in environment variables');
    }

    // Map periods to Alpha Vantage functions
    let functionName = 'TIME_SERIES_DAILY';
    let interval = '';

    if (resolution === '5' || resolution === '15' || resolution === '30' || resolution === '60') {
      functionName = 'TIME_SERIES_INTRADAY';
      interval = `&interval=${resolution}min`;
    } else if (days <= 7) {
      functionName = 'TIME_SERIES_DAILY';
    } else if (days <= 100) {
      functionName = 'TIME_SERIES_DAILY';
    } else {
      functionName = 'TIME_SERIES_WEEKLY';
    }

    const url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${symbol}${interval}&outputsize=compact&apikey=${apiKey}`;
    
    const response = await axios.get(url);
    const data = response.data;

    // Check for API errors
    if (data['Error Message'] || data['Note']) {
      throw new Error(data['Error Message'] || data['Note'] || 'Alpha Vantage API error');
    }

    // Transform Alpha Vantage data to Finnhub format
    let timeSeriesKey = 'Time Series (Daily)';
    if (functionName.includes('INTRADAY')) {
      timeSeriesKey = `Time Series (${resolution}min)`;
    } else if (functionName.includes('WEEKLY')) {
      timeSeriesKey = 'Weekly Time Series';
    }
    
    const timeSeries = data[timeSeriesKey];
    
    if (!timeSeries) {
      console.error('No time series data found:', data);
      throw new Error('No time series data available');
    }

    const timestamps: number[] = [];
    const closes: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const opens: number[] = [];
    const volumes: number[] = [];

    // Convert to arrays (reverse to get chronological order)
    const entries = Object.entries(timeSeries).reverse();
    
    // Limit to requested days
    const limitedEntries = entries.slice(-Math.min(days, entries.length));

    limitedEntries.forEach(([timestamp, values]: [string, any]) => {
      timestamps.push(new Date(timestamp).getTime() / 1000);
      opens.push(parseFloat(values['1. open']));
      highs.push(parseFloat(values['2. high']));
      lows.push(parseFloat(values['3. low']));
      closes.push(parseFloat(values['4. close']));
      volumes.push(parseInt(values['5. volume'] || '0'));
    });

    const result = {
      t: timestamps,
      o: opens,
      h: highs,
      l: lows,
      c: closes,
      v: volumes
    };

    return result;

  } catch (error: any) {
    console.error('Error in getHistoricalCandles (Alpha Vantage):', error.message);
    throw error;
  }
}

const getMarketData = async () => {
  // Popular tech stocks and blue chips
  const popularStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'];
  
  const finnhubClient = initializeFinnhubClient();
  
  const stockPromises = popularStocks.map(async (symbol) => {
    try {
      // Fetch both quote and basic profile data
      const [quoteRes, profileRes] = await Promise.all([
        finnhubClient.quote(symbol),
        finnhubClient.companyProfile2(symbol)
      ]);
      
      return { 
        symbol, 
        data: quoteRes.data,
        profile: profileRes.data
      };
    } catch (error) {
      return { symbol, error: 'Failed to fetch data' };
    }
  });
  
  const results = await Promise.all(stockPromises);
  
  // Sort by market cap (using price as proxy) and return top performers
  const validResults = results.filter(r => r.data && r.data.c);
  return validResults.sort((a, b) => (b.data?.c || 0) - (a.data?.c || 0));
}

const getMarketIndices = async () => {
  const indices = [
    { symbol: 'SPY', name: 'S&P 500 ETF' },
    { symbol: 'QQQ', name: 'NASDAQ 100 ETF' },
    { symbol: 'DIA', name: 'Dow Jones ETF' },
    { symbol: 'VTI', name: 'Total Stock Market' }
  ];
  
  const finnhubClient = initializeFinnhubClient();
  
  const indexPromises = indices.map(async (index) => {
    try {
      const response = await finnhubClient.quote(index.symbol);
      return { 
        symbol: index.symbol,
        name: index.name,
        data: response.data
      };
    } catch (error) {
      return { 
        symbol: index.symbol, 
        name: index.name,
        error: 'Failed to fetch data' 
      };
    }
  });
  
  return await Promise.all(indexPromises);
}

const getMarketMovers = async () => {
  // For demo, we'll get data for popular stocks and sort them
  // Finnhub has specific endpoints for market movers but they require premium
  const stocks = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL'];
  
  const finnhubClient = initializeFinnhubClient();
  
  const stockPromises = stocks.map(async (symbol) => {
    try {
      const [quoteRes, profileRes] = await Promise.all([
        finnhubClient.quote(symbol),
        finnhubClient.companyProfile2(symbol)
      ]);
      
      return { 
        symbol, 
        data: quoteRes.data,
        profile: profileRes.data
      };
    } catch (error) {
      return { symbol, error: 'Failed to fetch data' };
    }
  });
  
  const results = await Promise.all(stockPromises);
  const validResults = results.filter(r => r.data && r.data.c && r.data.dp !== null);
  
  // Sort by percent change
  const gainers = validResults
    .filter(r => (r.data?.dp || 0) > 0)
    .sort((a, b) => (b.data?.dp || 0) - (a.data?.dp || 0))
    .slice(0, 5);
    
  const losers = validResults
    .filter(r => (r.data?.dp || 0) < 0)
    .sort((a, b) => (a.data?.dp || 0) - (b.data?.dp || 0))
    .slice(0, 5);
  
  return { gainers, losers };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const type = searchParams.get('type')

    // Handle market data request
    if (type === 'market') {
      const marketData = await getMarketData()
      return NextResponse.json({ stocks: marketData })
    }

    // Handle market indices request
    if (type === 'indices') {
      const indicesData = await getMarketIndices()
      return NextResponse.json({ indices: indicesData })
    }

    // Handle market movers request
    if (type === 'movers') {
      const moversData = await getMarketMovers()
      return NextResponse.json(moversData)
    }

    // Handle market news request
    if (type === 'market-news') {
      const newsData = await getMarketNews()
      return NextResponse.json({ news: newsData })
    }

    // Handle individual symbol request
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 })
    }

    // Handle different data types for a specific symbol
    if (type === 'profile') {
      const profileData = await getCompanyProfile(symbol)
      return NextResponse.json(profileData)
    }

    if (type === 'news') {
      const newsData = await getCompanyNews(symbol)
      return NextResponse.json(newsData)
    }

    if (type === 'candles') {
      const resolution = searchParams.get('resolution') || 'D'
      const days = parseInt(searchParams.get('days') || '30')
      const candleData = await getHistoricalCandles(symbol, resolution, days)
      return NextResponse.json(candleData)
    }

    // Default: return quote data
    const data = await getQuote(symbol)
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Error fetching stock data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock data' }, 
      { status: 500 }
    )
  }
}
