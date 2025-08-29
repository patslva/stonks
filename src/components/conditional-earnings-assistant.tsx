'use client'

import { usePathname } from 'next/navigation'
import EarningsAssistant from './earnings-assistant'

export default function ConditionalEarningsAssistant() {
  const pathname = usePathname()
  
  // Hide earnings assistant on login page for security
  if (pathname === '/login') {
    return null
  }
  
  return <EarningsAssistant />
}