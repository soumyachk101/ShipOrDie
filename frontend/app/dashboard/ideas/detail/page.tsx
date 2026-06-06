"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { 
  ArrowLeft, Download, Bookmark, Sparkles, 
  DollarSign, MapPin, Compass, Briefcase, Eye, ShieldCheck
} from "lucide-react";

export default function IdeaDetailPage() {
  const searchParams = useSearchParams();
  const ideaId = searchParams.get("id");
  const { user, setUpgradeModal } = useAppStore();

  const [idea, setIdea] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (ideaId) {
      setLoading(true);
      api.get(`/api/ideas/${ideaId}`)
        .then((res: any) => setIdea(res))
        .catch(console.warn)
        .finally(() => setLoading(false));
    }
  }, [ideaId]);

  const handleSaveToggle = async () => {
    if (!idea) return;
    try {
      if (idea.is_saved) {
        await api.delete(`/api/ideas/${idea.id}/save`);
        setIdea({ ...idea, is_saved: false });
      } else {
        await api.post(`/api/ideas/${idea.id}/save`);
        setIdea({ ...idea, is_saved: true });
      }
    } catch (e) {
      alert("Failed to update vault bookmark.");
    }
  };

  const handleExportPDF = async () => {
    if (!idea) return;
    if (user?.tier !== 'pro') {
      setUpgradeModal(true);
      return;
    }
    setDownloading(true);
    try {
      const res = await api.get(`/api/ideas/${idea.id}/export`);
      // Trigger browser download link
      window.open(res.download_url, "_blank");
    } catch (e: any) {
      alert("Export failed. Please check if R2 or local directory is configured.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center bg-black min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="py-20 text-center bg-black min-h-screen">
        <p className="text-zinc-400">Idea details not found.</p>
        <Link href="/dashboard" className="text-indigo-400 text-xs mt-4 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const report = idea.monetization_report || {};

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8 bg-black">
      
      {/* Navigation and title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>

        <div className="flex gap-2">
          <button 
            onClick={handleSaveToggle}
            className={`flex items-center gap-1.5 rounded-xl border border-white/5 py-2 px-4 text-xs font-bold transition-all ${
              idea.is_saved ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
            }`}
          >
            <Bookmark className="h-4 w-4 fill-current" />
            {idea.is_saved ? 'Bookmarked in Vault' : 'Save to Vault'}
          </button>
          
          <button 
            onClick={handleExportPDF}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 py-2 px-4 text-xs font-bold text-white shadow-lg shadow-indigo-500/15 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Downloading...' : 'Export Idea PDF'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Left pane: Product Card Profile */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border-white/5">
            <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 py-0.5 px-2 rounded-full font-bold uppercase tracking-wider">
              Opportunity Pack
            </span>
            <h3 className="font-heading font-extrabold text-2xl text-white mt-4">SaaS Briefing</h3>
            
            <div className="mt-6 space-y-4">
              <div>
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Target User</span>
                <p className="text-white text-sm mt-0.5 font-bold">{idea.target_user}</p>
              </div>
              
              <div>
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Estimated Build</span>
                <p className="text-white text-sm mt-0.5 font-bold">~{idea.build_time_weeks} Weeks (Solo Dev)</p>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Niche Score</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-heading font-extrabold text-indigo-400">{idea.niche_score}</span>
                  <span className="text-zinc-500 text-xs">/ 10</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block mb-2">Tech Stack Recommendation</span>
              <div className="flex flex-wrap gap-1.5">
                {idea.stack.map((t: string) => (
                  <span key={t} className="text-xs bg-zinc-800 text-zinc-300 py-1 px-2.5 rounded-xl border border-white/5">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt signal summary */}
          <div className="glass-panel p-6 rounded-3xl border-white/5 bg-zinc-900/10">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block mb-2">Core Product Pitch</span>
            <p className="text-zinc-300 text-xs text-justify leading-relaxed">{idea.solution}</p>
          </div>
        </div>

        {/* Right pane: Monetization and VC reports details */}
        <div className="md:col-span-2 space-y-6">
          
          <div className="glass-panel p-8 rounded-3xl border-white/5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 mb-6">
              <Compass className="h-5.5 w-5.5" />
            </div>
            
            <h3 className="font-heading font-extrabold text-2xl text-white">Monetization & Market Feasibility</h3>
            <p className="text-zinc-400 text-sm mt-1">VC evaluation report structured by our agent pipeline.</p>

            <div className="grid sm:grid-cols-2 gap-6 mt-8">
              
              {/* Market size */}
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Market Size (TAM)</span>
                <p className="text-zinc-300 text-xs mt-1.5 text-justify">{report.tam_estimate}</p>
              </div>

              {/* Pricing model */}
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Pricing Model</span>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider">
                    {report.pricing_model}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider text-[10px] border ${
                    report.wtp_signal === "strong" ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-zinc-800 border-white/5 text-zinc-400'
                  }`}>
                    WTP: {report.wtp_signal}
                  </span>
                </div>
                <div className="mt-2.5 space-y-0.5 text-xs">
                  <div><span className="text-zinc-500">USD:</span> <span className="font-bold text-white">{report.price_range_usd}</span></div>
                  <div><span className="text-zinc-500">INR:</span> <span className="font-bold text-white">{report.price_range_inr}</span></div>
                </div>
              </div>
              
              {/* Competitors */}
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Competitive Landscape</span>
                <div className="mt-2.5 space-y-1.5">
                  {report.competitors && report.competitors.map((c: string) => (
                    <div key={c} className="text-xs text-zinc-300 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distribution channels */}
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> Distribution & SEO Channels</span>
                <div className="mt-2.5 space-y-1.5">
                  {report.distribution && report.distribution.map((d: string) => (
                    <div key={d} className="text-xs text-zinc-300 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Viability Verdict
              </span>
              <p className="text-zinc-300 text-xs text-justify italic font-medium leading-relaxed bg-zinc-900/40 p-4 rounded-xl border border-white/5">
                &quot;{report.summary}&quot;
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
