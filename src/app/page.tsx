export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Stonks 📈
        </h1>
        <p className="text-xl text-center text-gray-600 mb-8">
          AI-powered stock analysis with Reddit sentiment
        </p>
        
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