"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowUp, MessageCircle, Rss, Search, Star } from 'lucide-react';

type Flair = "VIRAL" | "HOT" | "POPULAR" | "NEW" | "DAILY";
type Sentiment = "bullish" | "bearish" | "neutral";

export type Comment = {
  author: string;
  body: string;
  score: number;
  created_utc: number;
  permalink: string;
};

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
  top_comments?: Comment[];
};

type ApiResponse = {
  posts: Post[];
  daily_threads: Post[];
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
    case "DAILY":
      return <span style={{...baseStyle, backgroundColor: '#dcfce7', color: '#166534'}}>Daily Thread</span>;
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
      border: '1px solid #333333', 
      boxShadow: '0 8px 32px rgb(0 0 0 / 0.4)',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    }} 
    onMouseEnter={(e) => {
      e.currentTarget.style.border = '1px solid #555555';
      e.currentTarget.style.backgroundColor = '#111111';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.border = '1px solid #333333';
      e.currentTarget.style.backgroundColor = '#0a0a0a';
    }}>
      <div style={{ padding: '24px' }}>
        <Meta post={post} />
        <Link 
          href={post.url} 
          target="_blank" 
          style={{ 
            display: 'block', 
            marginTop: '12px', 
            textDecoration: 'none' 
          }}
        >
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#999999', 
            marginTop: '0',
            lineHeight: '1.4',
            textDecoration: 'none'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#999999'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#999999'}>
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
        
        {post.flair === 'DAILY' && post.top_comments && post.top_comments.length > 0 ? (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #333333' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1db954', marginBottom: '12px' }}>
              🔥 Top Comments:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {post.top_comments.slice(0, 5).map((comment, index) => (
                <div key={index} style={{ 
                  backgroundColor: '#111111', 
                  padding: '8px 12px', 
                  borderRadius: '8px',
                  border: '1px solid #222222'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#1db954', fontWeight: '500' }}>
                      u/{comment.author}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <ArrowUp style={{ height: '12px', width: '12px', color: '#1db954' }} />
                      <span style={{ fontSize: '11px', color: '#999999' }}>{comment.score}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#cccccc', lineHeight: '1.4', margin: '0' }}>
                    {comment.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : post.externalUrl ? (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #333333' }}>
            <Link 
              href={post.externalUrl} 
              target="_blank" 
              style={{ 
                fontSize: '14px', 
                color: '#999999', 
                fontWeight: '500', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#999999'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#999999'}
            >
              View External Link →
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function DashboardClient() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [dailyThreads, setDailyThreads] = useState<Post[] | null>(null);
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
      setDailyThreads(data.daily_threads || []);
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
    <div style={{ backgroundColor: '#000000', padding: '0', margin: '0' }}>
      <div style={{ 
        backgroundColor: '#0a0a0a', 
        borderRadius: '16px', 
        border: '1px solid #333333', 
        padding: '32px',
        textAlign: 'center',
        marginBottom: '32px'
      }}>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', margin: '0', lineHeight: '1.1' }}>
          🚀📈 r/WallStreetBets Dashboard
        </h1>
        <p style={{ marginTop: '16px', fontSize: '20px', color: '#1db954', margin: '16px auto 0', maxWidth: '768px' }}>
          Real-time sentiment and trends from the world's most degenerate trading floor.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
        <div style={{ flex: '1', backgroundColor: '#0a0a0a', borderRadius: '12px', padding: '24px', border: '1px solid #333333' }}>
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
        
        <div style={{ flex: '1', backgroundColor: '#0a0a0a', borderRadius: '12px', padding: '24px', border: '1px solid #333333' }}>
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
        
        <div style={{ flex: '1', backgroundColor: '#0a0a0a', borderRadius: '12px', padding: '24px', border: '1px solid #333333' }}>
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
        
        <div style={{ flex: '1', backgroundColor: '#0a0a0a', borderRadius: '12px', padding: '24px', border: '1px solid #333333' }}>
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

      {dailyThreads && dailyThreads.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>
            📌 Daily Threads
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
            {dailyThreads.map((thread) => (
              <PostCard key={thread.id} post={thread} />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setTab("ALL")}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #333333',
              backgroundColor: tab === "ALL" ? '#333333' : '#0a0a0a',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            All
          </button>
          <button
            onClick={() => setTab("VIRAL")}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #333333',
              backgroundColor: tab === "VIRAL" ? '#333333' : '#0a0a0a',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Viral
          </button>
          <button
            onClick={() => setTab("HOT")}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #333333',
              backgroundColor: tab === "HOT" ? '#333333' : '#0a0a0a',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Hot
          </button>
          <button
            onClick={() => setTab("POPULAR")}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #333333',
              backgroundColor: tab === "POPULAR" ? '#333333' : '#0a0a0a',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Popular
          </button>
        </div>
        
        <div style={{ position: 'relative', width: '320px' }}>
          <Search style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            height: '16px', 
            width: '16px', 
            color: '#666666',
            pointerEvents: 'none'
          }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 40px',
              borderRadius: '8px',
              border: '1px solid #333333',
              backgroundColor: '#0a0a0a',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
              height: '40px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

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