"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { 
  Sparkles, CheckCircle2, Circle, AlertCircle, 
  ArrowLeft, ArrowRight, Loader2, Bookmark, CheckSquare
} from "lucide-react";

const PIPELINE_STEPS = [
  { id: "scraping", label: "Scraping market signals (Reddit, HN, PH)..." },
  { id: "synthesizing", label: "Synthesizing clusters in vector store..." },
  { id: "generating", label: "Generating SaaS idea cards..." },
  { id: "monetizing", label: "Analyzing monetization & competitors..." }
];

export default function IdeaGeneratorPage() {
  const { user, updateUserCredits, setUpgradeModal } = useAppStore();
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const startPipeline = async () => {
    setStatus("running");
    setCurrentStepIndex(0);
    setErrorMsg("");
    setJobId(null);
    try {
      const job = await api.post("/api/ideas/generate");
      setJobId(job.id);
      
      // Update local credits if free tier
      if (user && user.tier !== 'pro') {
        const remaining = Math.max(0, user.credits_remaining - 1);
        updateUserCredits(remaining, user.resume_credits_remaining);
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.detail || "Insufficient credits or server offline.");
      setStatus("failed");
    }
  };

  // Poll job status
  useEffect(() => {
    if (!jobId || status !== "running") return;

    let intervalId = setInterval(async () => {
      try {
        const job = await api.get(`/api/jobs/${jobId}`);
        const currentStatus = job.status.toLowerCase();
        
        if (currentStatus === "done") {
          clearInterval(intervalId);
          // Fetch generated ideas
          const resIdeas = await api.get(`/api/ideas?job_id=${jobId}`);
          setIdeas(resIdeas);
          setStatus("done");
        } else if (currentStatus === "failed") {
          clearInterval(intervalId);
          setErrorMsg("The AI agents pipeline crashed due to LLM rate limits.");
          setStatus("failed");
        } else {
          // Find step index
          const idx = PIPELINE_STEPS.findIndex(s => s.id === currentStatus);
          if (idx !== -1) {
            setCurrentStepIndex(idx);
          }
        }
      } catch (e) {
        console.warn("Error polling job status", e);
      }
    }, 2500);

    return () => clearInterval(intervalId);
  }, [jobId, status]);

  const handleSaveToggle = async (ideaId: string, currentSaved: boolean) => {
    try {
      if (currentSaved) {
        await api.delete(`/api/ideas/${ideaId}/save`);
        setIdeas(ideas.map(i => i.id === ideaId ? { ...i, is_saved: false } : i));
      } else {
        await api.post(`/api/ideas/${ideaId}/save`);
        setIdeas(ideas.map(i => i.id === ideaId ? { ...i, is_saved: true } : i));
      }
    } catch (e) {
      alert("Failed to update vault bookmark.");
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex h-10 w-10 animate-spin items-center justify-center rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Dashboard
      </Link>

      {/* State 1: Idle / Trigger */}
      {status === "idle" && (
        <div className="glass-panel text-center p-10 rounded-3xl border-white/5 max-w-2xl mx-auto shadow-2xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto mb-6">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-white">Trigger Idea Scraper</h2>
          <p className="text-zinc-400 text-sm mt-2 max-w-md mx-auto">
            Our multi-agent pipeline will query Reddit, HN, and PH for pain points. Cosine similarity clustering will group signals to construct SaaS models.
          </p>

          <div className="mt-8 rounded-2xl bg-zinc-950 p-4 border border-white/5 max-w-xs mx-auto text-left">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Remaining Credits:</span>
              <span className="font-bold text-zinc-300">{user?.tier === 'pro' ? 'Unlimited' : user?.credits_remaining ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500 mt-2 border-t border-white/5 pt-2">
              <span>Pipeline Run Cost:</span>
              <span className="font-bold text-indigo-400">-1 credit</span>
            </div>
          </div>

          <button 
            onClick={startPipeline}
            className="mt-8 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 py-3.5 px-8 font-bold text-white shadow-xl shadow-indigo-500/20"
          >
            Launch Multi-Agent Pipeline
          </button>
        </div>
      )}

      {/* State 2: Running loader */}
      {status === "running" && (
        <div className="glass-panel p-10 rounded-3xl border-white/5 max-w-xl mx-auto shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-heading font-extrabold text-lg text-white">Pipeline Execution</h3>
            <span className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Working...
            </span>
          </div>

          <div className="space-y-4">
            {PIPELINE_STEPS.map((step, idx) => {
              const isDone = idx < currentStepIndex;
              const isActive = idx === currentStepIndex;
              return (
                <div 
                  key={step.id} 
                  className={`flex items-start gap-3 rounded-xl p-4 transition-colors ${
                    isActive ? 'bg-indigo-500/5 border border-indigo-500/20' : 'border border-transparent'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                    ) : (
                      <Circle className="h-5 w-5 text-zinc-700" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isActive ? 'text-white' : isDone ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {step.label}
                    </p>
                    {isActive && (
                      <p className="text-[10.5px] text-indigo-300 mt-1 font-medium">
                        Agents are parsing embeddings...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-zinc-500 text-center text-xs mt-8 font-medium">
            Estimated run-time: ~60 seconds. Do not reload page.
          </p>
        </div>
      )}

      {/* State 3: Failed */}
      {status === "failed" && (
        <div className="glass-panel text-center p-10 rounded-3xl border-rose-500/20 bg-rose-500/5 max-w-md mx-auto shadow-2xl">
          <AlertCircle className="h-12 w-12 text-rose-400 mx-auto mb-4" />
          <h3 className="font-heading font-bold text-lg text-white">Pipeline run failed</h3>
          <p className="text-zinc-400 text-xs mt-2">{errorMsg}</p>
          <button 
            onClick={startPipeline}
            className="mt-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/5 py-2 px-5 text-sm font-bold text-white"
          >
            Retry Generation
          </button>
        </div>
      )}

      {/* State 4: Done (Results grid!) */}
      {status === "done" && (
        <div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="font-heading font-extrabold text-2xl text-white">SaaS Validation Cards</h2>
              <p className="text-zinc-400 text-xs mt-1">Multi-agent synthesis generated {ideas.length} custom platforms.</p>
            </div>
            <button 
              onClick={startPipeline}
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-2 px-4 text-xs font-bold text-zinc-300"
            >
              Regenerate Fresh Batch
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {ideas.map((idea) => (
              <div 
                key={idea.id} 
                className="glass-panel p-6 rounded-3xl border-white/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Niche Score: {idea.niche_score} / 10
                    </span>
                    
                    <button 
                      onClick={() => handleSaveToggle(idea.id, idea.is_saved)}
                      className={`p-1.5 rounded-xl border border-white/5 transition-colors ${
                        idea.is_saved ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      <Bookmark className="h-4.5 w-4.5 fill-current" />
                    </button>
                  </div>

                  <h3 className="font-heading font-bold text-lg text-white mt-4">Niche Target: {idea.target_user}</h3>
                  <div className="mt-4 space-y-3">
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Problem:</span>
                      <p className="text-zinc-300 text-xs mt-0.5 text-justify">{idea.problem}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Solution:</span>
                      <p className="text-zinc-300 text-xs mt-0.5 text-justify">{idea.solution}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {idea.stack.map((t: string) => (
                      <span key={t} className="text-[9.5px] bg-zinc-800 text-zinc-400 py-0.5 px-2 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                  
                  <Link 
                    href={`/dashboard/ideas/detail?id=${idea.id}`}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    Monetization Plan <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
