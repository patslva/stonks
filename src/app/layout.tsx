import './globals.css'
import { Inter } from 'next/font/google'
import EarningsAssistant from '@/components/earnings-assistant'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Stonks - AI Stock Analysis',
  description: 'AI-powered stock analysis with Reddit sentiment',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <EarningsAssistant />
      </body>
    </html>
  )
}
