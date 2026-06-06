"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import {
  Bookmark, ArrowRight, Search, Star,
  Clock, BookmarkX
} from "lucide-react";

const subscribeToHydration = () => () => {};

interface IdeaRecord {
  id: string;
  niche_score: number;
  target_user: string;
  problem: string;
  solution: string;
  stack: string[];
  is_saved: boolean;
  build_time_weeks: number;
  created_at?: string;
}

export default function VaultPage() {
  const { token } = useAppStore();
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  useEffect(() => {
    if (mounted && !token) {
      window.location.href = "/auth/signin";
    }
  }, [mounted, token]);

  useEffect(() => {
    if (token) {
      const timeout = window.setTimeout(() => {
        api.get("/api/ideas")
          .then((data: IdeaRecord[]) => setIdeas(data.filter(i => i.is_saved)))
          .catch(() => {})
          .finally(() => setLoading(false));
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [token]);

  const handleUnsave = async (ideaId: string) => {
    try {
      await api.delete(`/api/ideas/${ideaId}/save`);
      setIdeas(ideas.filter(i => i.id !== ideaId));
    } catch {
      alert("Failed to remove from vault.");
    }
  };

  const filteredIdeas = ideas.filter(idea => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      idea.target_user.toLowerCase().includes(q) ||
      idea.problem.toLowerCase().includes(q) ||
      idea.solution.toLowerCase().includes(q)
    );
  });

  if (!mounted || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex h-10 w-10 animate-spin items-center justify-center rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-9 flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="editorial-label">Workspace / vault</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-white sm:text-4xl">
            Saved Vault
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Your curated collection of bookmarked SaaS opportunities. Only the ideas worth building.
          </p>
        </div>
        <Link href="/dashboard/ideas" className="premium-secondary">
          Browse All Ideas <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Search */}
      {ideas.length > 0 && (
        <div className="mb-8 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search saved ideas..."
              className="w-full !pl-10 !pr-4 !py-2.5 text-sm rounded-xl"
            />
          </div>
          <span className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" /> {ideas.length} bookmarked
          </span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="py-16 text-center glass-panel rounded-2xl border-white/5">
          {ideas.length === 0 ? (
            <>
              <Bookmark className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h4 className="font-bold text-white text-lg">Your Vault is Empty</h4>
              <p className="text-zinc-500 text-sm mt-1 mb-6">
                Bookmark ideas from the idea history to save them here for quick access.
              </p>
              <Link href="/dashboard/ideas" className="premium-primary !min-h-10">
                <Bookmark className="h-4 w-4" /> Browse Ideas
              </Link>
            </>
          ) : (
            <>
              <Search className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h4 className="font-bold text-white text-lg">No Matching Ideas</h4>
              <p className="text-zinc-500 text-sm mt-1">
                Try a different search term.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredIdeas.map(idea => (
            <div
              key={idea.id}
              className="glass-panel p-6 rounded-2xl border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Niche Score: {idea.niche_score}
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-zinc-500 bg-zinc-800">
                      <Clock className="h-2.5 w-2.5" /> ~{idea.build_time_weeks}w
                    </span>
                  </div>
                  <button
                    onClick={() => handleUnsave(idea.id)}
                    className="p-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 transition-colors hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400"
                    title="Remove from vault"
                  >
                    <BookmarkX className="h-4 w-4" />
                  </button>
                </div>

                <h4 className="font-bold text-lg text-white mt-4">
                  Niche Target: {idea.target_user}
                </h4>
                <p className="text-zinc-300 text-xs mt-2 text-justify line-clamp-2">
                  {idea.solution}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {idea.stack.map((t: string) => (
                    <span
                      key={t}
                      className="text-[10px] bg-zinc-800 text-zinc-400 py-0.5 px-2 rounded"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Build: ~{idea.build_time_weeks} weeks
                </span>
                <Link
                  href={`/dashboard/ideas/detail?id=${idea.id}`}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  Monetization Plan <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
