"use client";

import { useEffect, useMemo, useState } from "react";
import { Rss, Star, TrendingUp, MessageSquare } from 'lucide-react';

import Header from "@/components/wsb/header";
import KpiCard from "@/components/wsb/kpi-card";
import Filters from "@/components/wsb/filters";
import PostCard, { type PostItem } from "@/components/wsb/post-card";

// This is the data type we expect from the API
export type Post = {
  id: string;
  title: string;
  author: string;
  createdAt: string; // ISO string
  flair: "VIRAL" | "HOT" | "POPULAR" | "NEW";
  score: number;
  comments: number;
  rank: number;
  url: string;
  sentiment: "bullish" | "bearish" | "neutral";
};

type ApiResponse = {
  posts: Post[];
};

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from the API when the component mounts
  useEffect(() => {
    async function loadPosts() {
      setLoading(true);
      try {
        const res = await fetch(`/api/wsb-posts`);
        const data: ApiResponse = await res.json();
        setPosts(data.posts || []);
      } catch (e) {
        console.error("Failed to fetch posts:", e);
        setPosts([]); // Set to empty array on error
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, []);

  // Calculate metrics based on the fetched posts
  const metrics = useMemo(() => {
    const total = posts.length;
    const highEngagement = posts.filter((p) => p.score >= 1000).length;
    const avgScore = total > 0 ? Math.round(posts.reduce((a, b) => a + b.score, 0) / total) : 0;
    const bullishCount = posts.filter(p => p.sentiment === 'bullish').length;

    return [
      { label: "Total Posts", value: formatNumber(total), icon: Rss, delta: "last 24h" },
      { label: "High Engagement", value: formatNumber(highEngagement), icon: Star, delta: "≥ 1k score" },
      { label: "Avg Score", value: formatNumber(avgScore), icon: TrendingUp, delta: "per post" },
      { label: "Bullish Posts", value: formatNumber(bullishCount), icon: MessageSquare, delta: "today" },
    ];
  }, [posts]);

  // Transform the raw post data into the format expected by the PostCard component
  const postItems: PostItem[] = useMemo(() => {
    return posts.map(p => ({
      id: p.id,
      author: `u/${p.author}`,
      createdAt: new Date(p.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      tag: p.flair,
      title: p.title,
      upvotes: p.score,
      comments: p.comments,
      rank: p.rank,
      href: p.url,
    }));
  }, [posts]);

  return (
    <>
      <Header />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <KpiCard key={m.label} label={m.label} value={loading ? "-" : m.value} delta={m.delta} icon={m.icon} />
        ))}
      </section>

      <section className="mt-8">
        <Filters />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {loading ? (
            <p className="text-white col-span-full text-center py-10">Loading posts...</p>
          ) : postItems.length > 0 ? (
            postItems.map((p) => (
              <PostCard key={p.id} {...p} />
            ))
          ) : (
            <p className="text-white col-span-full text-center py-10">No posts found.</p>
          )}
        </div>
      </section>
    </>
  );
}
