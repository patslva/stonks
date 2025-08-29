import './globals.css'
import { Inter } from 'next/font/google'
import ConditionalEarningsAssistant from '../components/conditional-earnings-assistant'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Stonks - AI Stock Analysis',
  description: "Trading dashboard with AI-assisted 'betting' tips",
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
        <ConditionalEarningsAssistant />
      </body>
    </html>
  )
}