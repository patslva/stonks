"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowUp, MessageCircle, Rss, Search, Star } from 'lucide-react';

type Flair = "VIRAL" | "HOT" | "POPULAR" | "NEW";
type Sentiment = "bullish" | "bearish" | "neutral";

export type Post = {
  id: string;
  title: string;
  author: string;
  createdAt: string; // ISO
  flair: Flair;
  score: number;
  comments: number;
  rank: number;
  url: string;
  externalUrl?: string;
  sentiment: Sentiment;
};

type ApiResponse = {
  posts: Post[];
};

function formatNumber(n: number) {
  return Intl.NumberFormat("en", { notation: "compact" }).format(n);
}

function sentimentEmoji(sentiment: Sentiment) {
  switch (sentiment) {
    case "bullish":
      return "🚀";
    case "bearish":
      return "🔥";
    default:
      return "";
  }
}

function flairBadge(flair: Flair) {
  const baseStyle = {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    border: 'none'
  };
  
  switch (flair) {
    case "VIRAL":
      return <span style={{...baseStyle, backgroundColor: '#fef3c7', color: '#92400e'}}>Viral</span>;
    case "HOT":
      return <span style={{...baseStyle, backgroundColor: '#fee2e2', color: '#991b1b'}}>Hot</span>;
    case "POPULAR":
      return <span style={{...baseStyle, backgroundColor: '#dbeafe', color: '#1e40af'}}>Popular</span>;
    default:
      return <span style={{...baseStyle, backgroundColor: '#1a1a1a', color: '#b3b3b3'}}>New</span>;
  }
}

function Meta({ post }: { post: Post }) {
  const date = new Date(post.createdAt);
  const time = date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#b3b3b3' }}>
      <span style={{ fontWeight: '500', color: '#1db954' }}>{`u/${post.author}`}</span>
      <span>•</span>
      <span>{time}</span>
      <span>•</span>
      {flairBadge(post.flair)}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <div style={{ 
      backgroundColor: '#0a0a0a', 
      borderRadius: '16px', 
      border: '1px solid #1a1a1a', 
      boxShadow: '0 8px 32px rgb(0 0 0 / 0.4)',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    }} 
    onMouseEnter={(e) => {
      e.currentTarget.style.border = '1px solid #1db954';
      e.currentTarget.style.backgroundColor = '#111111';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.border = '1px solid #1a1a1a';
      e.currentTarget.style.backgroundColor = '#0a0a0a';
    }}>
      <div style={{ padding: '24px' }}>
        <Meta post={post} />
        <Link href={post.url} target="_blank" className="block mt-3">
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#ffffff', 
            marginTop: '12px',
            lineHeight: '1.4'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#1db954'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}>
            {post.title}
          </h3>
        </Link>
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              backgroundColor: '#1a1a1a', 
              padding: '8px 12px', 
              borderRadius: '20px',
              border: '1px solid #333333'
            }}>
              <ArrowUp style={{ height: '16px', width: '16px', color: '#1db954' }} />
              <span style={{ fontWeight: '500', color: '#ffffff', fontSize: '14px' }}>{formatNumber(post.score)}</span>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              backgroundColor: '#1a1a1a', 
              padding: '8px 12px', 
              borderRadius: '20px',
              border: '1px solid #333333'
            }}>
              <MessageCircle style={{ height: '16px', width: '16px', color: '#1db954' }} />
              <span style={{ fontWeight: '500', color: '#ffffff', fontSize: '14px' }}>{formatNumber(post.comments)}</span>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              backgroundColor: '#1a1a1a', 
              padding: '8px 12px', 
              borderRadius: '20px',
              border: '1px solid #333333'
            }}>
              <Star style={{ height: '16px', width: '16px', color: '#1db954' }} />
              <span style={{ fontWeight: '500', color: '#ffffff', fontSize: '14px' }}>#{post.rank}</span>
            </div>
          </div>
          <div style={{ fontSize: '32px' }}>{sentimentEmoji(post.sentiment)}</div>
        </div>
        
        {post.externalUrl && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #333333' }}>
            <Link 
              href={post.externalUrl} 
              target="_blank" 
              style={{ 
                fontSize: '14px', 
                color: '#1db954', 
                fontWeight: '500', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#22c55e'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#1db954'}
            >
              View External Link →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardClient() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"ALL" | Flair>("ALL");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/wsb-posts`, { cache: "no-store" });
      const data: ApiResponse = await res.json();
      setPosts(data.posts);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!posts) return [];
    const byTab =
      tab === "ALL" ? posts : posts.filter((p) => p.flair === tab);
    if (!query) return byTab;
    const q = query.toLowerCase();
    return byTab.filter((p) => p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q));
  }, [posts, query, tab]);

  const total = posts?.length ?? 0;
  const highEngagement = posts?.filter((p) => p.score >= 1000).length ?? 0;
  const avgScore = posts && posts.length > 0 ? Math.round(posts.reduce((a, b) => a + b.score, 0) / posts.length) : 0;
  const bullishCount = posts?.filter(p => p.sentiment === 'bullish').length ?? 0;

  return (
    <div className="space-y-8">
      <header className="text-center mb-8">
        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
          🚀📈 r/WallStreetBets Dashboard
        </h1>
        <p className="mt-4 text-xl text-green-400 max-w-3xl mx-auto">
          Real-time sentiment and trends from the world's most degenerate trading floor.
        </p>
      </header>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
        <div style={{ flex: '1', backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '24px', border: '1px solid #333333' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL POSTS</p>
              <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', marginTop: '4px', lineHeight: '1' }}>{total}</p>
              <p style={{ fontSize: '12px', color: '#1db954', marginTop: '4px' }}>+4 today</p>
            </div>
            <div style={{ height: '48px', width: '48px', backgroundColor: '#1db954', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Rss style={{ height: '24px', width: '24px', color: '#000000' }} />
            </div>
          </div>
        </div>
        
        <div style={{ flex: '1', backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '24px', border: '1px solid #333333' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>HIGH ENGAGEMENT</p>
              <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', marginTop: '4px', lineHeight: '1' }}>{highEngagement}</p>
              <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>last 24h</p>
            </div>
            <div style={{ height: '48px', width: '48px', backgroundColor: '#1db954', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star style={{ height: '24px', width: '24px', color: '#000000' }} />
            </div>
          </div>
        </div>
        
        <div style={{ flex: '1', backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '24px', border: '1px solid #333333' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AVG SCORE</p>
              <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', marginTop: '4px', lineHeight: '1' }}>{formatNumber(avgScore)}</p>
              <p style={{ fontSize: '12px', color: '#1db954', marginTop: '4px' }}>+12%</p>
            </div>
            <div style={{ height: '48px', width: '48px', backgroundColor: '#1db954', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUp style={{ height: '24px', width: '24px', color: '#000000' }} />
            </div>
          </div>
        </div>
        
        <div style={{ flex: '1', backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '24px', border: '1px solid #333333' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>BULLISH POSTS</p>
              <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', marginTop: '4px', lineHeight: '1' }}>{bullishCount}</p>
              <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>today</p>
            </div>
            <div style={{ height: '48px', width: '48px', backgroundColor: '#1db954', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle style={{ height: '24px', width: '24px', color: '#000000' }} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="bg-zinc-900/60 border-emerald-500/15">
              <TabsTrigger value="ALL" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-black">All</TabsTrigger>
              <TabsTrigger value="VIRAL" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-black">Viral</TabsTrigger>
              <TabsTrigger value="HOT" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-black">Hot</TabsTrigger>
              <TabsTrigger value="POPULAR" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-black">Popular</TabsTrigger>
            </TabsList>
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts..."
                className="pl-9 bg-zinc-900/60 border-emerald-500/15 focus-visible:ring-emerald-500/30"
              />
            </div>
          </div>
          
          <TabsContent value={tab} className="mt-6">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
              {filtered.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280', padding: '64px 0' }}>
                  <p style={{ fontSize: '18px', fontWeight: '500' }}>No posts found</p>
                  <p>Try adjusting your search or filters.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <footer className="text-center text-sm text-muted-foreground">
        <p>Last refresh: {lastRefresh ? lastRefresh.toLocaleTimeString() : "Loading..."}</p>
        <Button 
          onClick={() => load()} 
          disabled={loading} 
          className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-black border-0"
        >
          {loading ? "🔄 Refreshing..." : "🔄 Refresh Now"}
        </Button>
      </footer>
    </div>
  );
}