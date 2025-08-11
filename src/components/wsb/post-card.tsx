"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowBigUp, MessageCircle, Star, ExternalLink } from 'lucide-react'

export type PostItem = {
  id: string
  author: string
  createdAt: string
  tag?: "Viral" | "Hot" | "Popular" | "New" | string
  title: string
  upvotes: number
  comments: number
  rank?: number
  href?: string
}

function StatPill({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/15 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-300">
      {icon}
      {children}
    </span>
  )
}

export default function PostCard({
  author = "u/someone",
  createdAt = "Just now",
  tag = "New",
  title = "Post title",
  upvotes = 0,
  comments = 0,
  rank = 0,
  href = "#",
}: PostItem) {
  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
    return String(n)
  }

  return (
    <Card className="group relative overflow-hidden border-emerald-500/15 bg-zinc-950/60 p-5 transition hover:border-emerald-500/30">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-emerald-400">{author}</span>
        <span aria-hidden>{"•"}</span>
        <span>{createdAt}</span>
        <Badge variant="secondary" className="ml-1 bg-zinc-900/60 text-emerald-300">
          {tag}
        </Badge>
      </div>

      <a href={href} className="mt-2 block font-semibold tracking-tight hover:underline text-white">
        {title}
      </a>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatPill icon={<ArrowBigUp className="h-4 w-4 text-emerald-400" />}>{formatNumber(upvotes)}</StatPill>
        <StatPill icon={<MessageCircle className="h-4 w-4 text-emerald-400" />}>{formatNumber(comments)}</StatPill>
        <StatPill icon={<Star className="h-4 w-4 text-emerald-400" />}>{"#" + rank}</StatPill>
      </div>

      <div className="mt-4">
        <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" asChild>
          <a href={href}>
            View External Link
            <ExternalLink className="ml-1 h-4 w-4" />
          </a>
        </Button>
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5" />
    </Card>
  )
}
