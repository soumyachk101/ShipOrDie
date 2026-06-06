"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore, ResumeInput } from "@/store/useAppStore";
import { 
  Zap, Sparkles, BookOpen, Layers, Bookmark, 
  Trash2, Download, RefreshCw, PlusCircle, ArrowRight,
  TrendingUp, FileText, BadgeAlert, CheckCircle, HelpCircle
} from "lucide-react";

export default function DashboardPage() {
  const { token, user, setUpgradeModal, updateUserCredits } = useAppStore();

  const [activeTab, setActiveTab] = useState<"ideas" | "vault" | "resumes">("ideas");
  const [ideas, setIdeas] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tailorModalOpen, setTailorModalOpen] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [processingTailor, setProcessingTailor] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Authentication check
  useEffect(() => {
    if (mounted && !token) {
      window.location.href = "/auth/signin";
    }
  }, [token]);

  // Load dashboard data
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch ideas
      const fetchedIdeas = await api.get("/api/ideas");
      setIdeas(fetchedIdeas);

      // 2. Fetch resumes
      const fetchedResumes = await api.get("/api/resume");
      setResumes(fetchedResumes);

      // 3. Sync credits balance
      const balance = await api.get("/api/billing/status");
      updateUserCredits(balance.credits_remaining, balance.resume_credits_remaining);
    } catch (e) {
      console.warn("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const handleDeleteResume = async (id: string) => {
    if (confirm("Are you sure you want to delete this resume?")) {
      try {
        await api.delete(`/api/resume/${id}`);
        setResumes(resumes.filter(r => r.id !== id));
      } catch (e) {
        alert("Failed to delete resume.");
      }
    }
  };

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

  const triggerTailor = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    setJobDescription("");
    setTailorModalOpen(true);
  };

  const handleTailorSubmit = async () => {
    if (!selectedResumeId || !jobDescription.trim()) return;
    setProcessingTailor(true);
    try {
      const res = await api.post(`/api/resume/${selectedResumeId}/tailor`, {
        job_description: jobDescription
      });
      // Set active job tracker
      useAppStore.getState().setActiveResumeJobId(res.id);
      // Route to loader screen
      window.location.href = `/dashboard/resume/generating?job_id=${res.id}`;
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to start tailoring.");
    } finally {
      setProcessingTailor(false);
      setTailorModalOpen(false);
    }
  };

  const handleDemoUpgrade = async () => {
    try {
      const res = await api.post("/api/billing/upgrade-demo");
      updateUserCredits(res.user.credits_remaining, res.user.resume_credits_remaining);
      alert("Demo account upgraded to Pro! Enjoy unlimited generation.");
      loadData();
    } catch (e) {
      alert("Demo upgrade failed.");
    }
  };

  if (!mounted || !token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex h-10 w-10 animate-spin items-center justify-center rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Top Banner with Quick Stats */}
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        
        {/* Credits summary */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Idea Credits</div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {user.tier === "pro" ? "Unlimited" : user.credits_remaining}
          </div>
          <div className="text-zinc-600 text-[10.5px] mt-1">Free tier gets 3 credits</div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Resume Credits</div>
          <div className="mt-2 text-2xl font-extrabold text-white">{user.resume_credits_remaining}</div>
          <div className="text-zinc-600 text-[10.5px] mt-1">Free gets 1, Pro gets 10</div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Total Resumes</div>
          <div className="mt-2 text-2xl font-extrabold text-white">{resumes.length}</div>
          <div className="text-zinc-600 text-[10.5px] mt-1">Saved variations</div>
        </div>

        {/* Upgrade card */}
        <div className="glass-panel p-6 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 border-indigo-500/20 flex flex-col justify-between">
          <div>
            <div className="text-indigo-400 text-xs uppercase tracking-wider font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Account: {user.tier.toUpperCase()}
            </div>
            <p className="text-zinc-400 text-xs mt-1">Unlock PDF exports and Microsoft Word files.</p>
          </div>
          {user.tier !== "pro" ? (
            <button 
              onClick={() => setUpgradeModal(true)}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 py-1.5 px-3 text-xs font-bold text-white text-center hover:opacity-90"
            >
              Upgrade Now
            </button>
          ) : (
            <span className="mt-3 text-emerald-400 text-xs font-semibold flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> Pro features unlocked
            </span>
          )}
        </div>
      </div>

      {/* Main Actions Container */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        
        {/* Run Idea pipeline */}
        <div className="glass-panel rounded-3xl p-8 border border-white/5 bg-zinc-900/10 flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-extrabold text-2xl text-white">Generate Micro-SaaS Ideas</h3>
            <p className="text-zinc-400 text-sm mt-2">
              Launch our multi-agent scrapper. Collect Reddit, HN, and ProductHunt pain points and package them into structured business ideas.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <span className="text-zinc-500 text-xs">Cost: 1 Idea Credit</span>
            <Link 
              href="/dashboard/generate"
              className="flex items-center gap-1.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 py-2.5 px-5 font-bold text-white text-sm"
            >
              Run Idea Engine <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Build Resume */}
        <div className="glass-panel rounded-3xl p-8 border border-white/5 bg-zinc-900/10 flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-extrabold text-2xl text-white">Create Undetectable Resume</h3>
            <p className="text-zinc-400 text-sm mt-2">
              Fill out details, optional job description, and select visual layouts. Humanize lexical patterns to score &lt;10% on AI content detectors.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <span className="text-zinc-500 text-xs">Cost: 1 Resume Credit</span>
            <Link 
              href="/dashboard/resume/new"
              className="flex items-center gap-1.5 rounded-2xl bg-violet-500 hover:bg-violet-600 py-2.5 px-5 font-bold text-white text-sm"
            >
              Start Resume Builder <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-white/5 mb-8">
        <button 
          onClick={() => setActiveTab("ideas")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "ideas" ? "border-indigo-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          SaaS Opportunity History ({ideas.length})
        </button>
        <button 
          onClick={() => setActiveTab("vault")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "vault" ? "border-indigo-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Saved Vault ({ideas.filter(i => i.is_saved).length})
        </button>
        <button 
          onClick={() => setActiveTab("resumes")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "resumes" ? "border-indigo-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Resume Profiles ({resumes.length})
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <div>
          {/* Tab 1: Ideas History */}
          {activeTab === "ideas" && (
            ideas.length === 0 ? (
              <div className="py-16 text-center glass-panel rounded-2xl border-white/5">
                <TrendingUp className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <h4 className="font-bold text-white text-lg">No SaaS Ideas Yet</h4>
                <p className="text-zinc-500 text-sm mt-1">Trigger the multi-agent scrapper above to generate opportunities.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {ideas.map((idea) => (
                  <div key={idea.id} className="glass-panel p-6 rounded-2xl border-white/5 hover:border-indigo-500/20 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Niche Score: {idea.niche_score}
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
                      
                      <h4 className="font-bold text-lg text-white mt-4">Niche Target: {idea.target_user}</h4>
                      <p className="text-zinc-400 text-xs mt-2 font-semibold uppercase tracking-wider">Problem:</p>
                      <p className="text-zinc-300 text-xs mt-1 text-justify">{idea.problem}</p>
                      
                      <p className="text-zinc-400 text-xs mt-3.5 font-semibold uppercase tracking-wider">Solution:</p>
                      <p className="text-zinc-300 text-xs mt-1 text-justify">{idea.solution}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {idea.stack.map((t: string) => (
                          <span key={t} className="text-[10px] bg-zinc-800 text-zinc-400 py-0.5 px-2 rounded">
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
            )
          )}

          {/* Tab 2: Vault */}
          {activeTab === "vault" && (
            ideas.filter(i => i.is_saved).length === 0 ? (
              <div className="py-16 text-center glass-panel rounded-2xl border-white/5">
                <Bookmark className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <h4 className="font-bold text-white text-lg">Your Vault is Empty</h4>
                <p className="text-zinc-500 text-sm mt-1">Bookmark ideas generated in history to save them to your vault.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {ideas.filter(i => i.is_saved).map((idea) => (
                  <div key={idea.id} className="glass-panel p-6 rounded-2xl border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Niche Score: {idea.niche_score}
                        </span>
                        <button 
                          onClick={() => handleSaveToggle(idea.id, true)}
                          className="p-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 transition-colors"
                        >
                          <Bookmark className="h-4.5 w-4.5 fill-current" />
                        </button>
                      </div>
                      
                      <h4 className="font-bold text-lg text-white mt-4">Niche Target: {idea.target_user}</h4>
                      <p className="text-zinc-300 text-xs mt-2 text-justify">{idea.solution}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Build: ~{idea.build_time_weeks} weeks</span>
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
            )
          )}

          {/* Tab 3: Resumes */}
          {activeTab === "resumes" && (
            resumes.length === 0 ? (
              <div className="py-16 text-center glass-panel rounded-2xl border-white/5">
                <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <h4 className="font-bold text-white text-lg">No Resumes Generated</h4>
                <p className="text-zinc-500 text-sm mt-1">Create an ATS-optimized, humanized resume above.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {resumes.map((resume) => (
                  <div key={resume.id} className="glass-panel p-6 rounded-2xl border-white/5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg text-white">{resume.title}</h4>
                          <span className="text-[10px] text-zinc-500">Style: {resume.template.replace('_', ' ')}</span>
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <span className={`text-[10px] py-0.5 px-2 rounded-full font-bold border ${
                            resume.ai_score < 0.15 ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                          }`}>
                            AI Score: {Math.round(resume.ai_score * 100)}%
                          </span>
                          <span className="text-[10px] py-0.5 px-2 rounded-full font-bold bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
                            ATS match: {Math.round(resume.ats_score * 100)}%
                          </span>
                        </div>
                      </div>

                      <p className="text-zinc-400 text-xs mt-4 line-clamp-2 italic">
                        &quot;{resume.final_resume?.summary || 'No summary compiled.'}&quot;
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => triggerTailor(resume.id)}
                          className="text-xs bg-zinc-800 hover:bg-zinc-750 text-zinc-300 py-1.5 px-3 rounded-lg border border-white/5"
                        >
                          Tailor Variant
                        </button>
                        <button 
                          onClick={() => handleDeleteResume(resume.id)}
                          className="text-zinc-500 hover:text-rose-400 p-1.5"
                          title="Delete Resume"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                      
                      <Link 
                        href={`/dashboard/resume/preview?id=${resume.id}`}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        Preview & Export <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Developer seed bypass buttons */}
      <div className="mt-20 border-t border-white/5 pt-8 flex flex-col items-center gap-4">
        <span className="text-zinc-600 text-xs font-semibold uppercase tracking-wider">Developer controls (Local Run Helper)</span>
        <div className="flex flex-wrap justify-center gap-3">
          <button 
            onClick={handleDemoUpgrade}
            className="rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 py-2 px-4 text-xs font-bold text-amber-300"
          >
            Upgrade Demo to PRO Tier
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              window.location.reload();
            }}
            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-2 px-4 text-xs font-bold text-zinc-300"
          >
            Reset/Logout Session
          </button>
        </div>
      </div>

      {/* Quick Tailor Modal */}
      {tailorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="font-heading font-extrabold text-xl text-white">Tailor Resume for New Job</h3>
            <p className="text-zinc-400 text-xs mt-1">We will optimize your experiences and skills to match the target keywords.</p>
            
            <textarea 
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target Job Description (JD) text here..."
              rows={6}
              className="mt-4 w-full rounded-2xl p-4 text-sm text-white"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setTailorModalOpen(false)}
                className="rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 py-2 px-4 text-sm font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button 
                onClick={handleTailorSubmit}
                disabled={processingTailor || !jobDescription.trim()}
                className="rounded-xl bg-indigo-500 hover:bg-indigo-600 py-2 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {processingTailor ? "Starting pipeline..." : "Run Tailoring (-1 resume credit)"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
