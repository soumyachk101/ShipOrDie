"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Sparkles, Check, ArrowRight, ShieldCheck, Cpu } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

const subscribeToHydration = () => () => {};

export default function LandingPage() {
  const { token } = useAppStore();
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const isAuthenticated = isHydrated && Boolean(token);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-black">
      
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px]" />

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-24 pb-16 text-center sm:px-6 lg:px-8">
        
        {/* Launch tag */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/5 px-4 py-1.5 text-xs font-semibold text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>v2.0 — Resume Humanizer Engine Live</span>
        </div>

        <h1 className="mt-8 font-heading font-extrabold text-4xl tracking-tight sm:text-6xl text-white">
          Ship SaaS Ideas.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300">
            Beat AI Filters.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
          ShipOrDie is a developer tool suite containing an AI-agent Idea Engine that searches market signals for SaaS opportunities, and an undetectable ATS-optimized Resume Builder.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={isAuthenticated ? "/dashboard" : "/auth/signin"}
            className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 py-3.5 px-6 font-bold text-white shadow-xl shadow-indigo-500/20 transition-all hover:scale-105"
          >
            {isAuthenticated ? "Go to Dashboard" : "Build Your First Idea"}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#how-it-works"
            className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 py-3.5 px-6 font-bold text-zinc-200 transition-colors"
          >
            How it works
          </a>
        </div>
      </section>

      {/* Showcase / Product Feature Selection */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Module 1: Idea Engine */}
          <div className="glass-panel rounded-3xl p-8 border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-6">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-extrabold text-2xl text-white">Module 1: AI Idea Engine</h3>
              <p className="mt-3 text-zinc-400 text-sm">
                Aggregates signals from Reddit pain points, ProductHunt launches, and Ask HN threads. Synthesizes opportunities into complete business packs with competitive analyses and pricing strategies.
              </p>
              
              <ul className="mt-6 space-y-2.5 text-zinc-300 text-xs">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-indigo-400" />
                  <span>Real-time Reddit & HN signal scraper</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-indigo-400" />
                  <span>ChromaDB semantic opportunity clustering</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-indigo-400" />
                  <span>Comprehensive USD & INR pricing strategies</span>
                </li>
              </ul>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/5">
              <Link 
                href={isAuthenticated ? "/dashboard" : "/auth/signin"}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-400 hover:text-indigo-300"
              >
                Launch Idea Pipeline <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Module 2: Resume Builder */}
          <div className="glass-panel rounded-3xl p-8 border border-white/5 hover:border-violet-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400 mb-6">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-extrabold text-2xl text-white">Module 2: Undetectable Resume Builder</h3>
              <p className="mt-3 text-zinc-400 text-sm">
                Rewrites details through a multi-pass pipeline. Randomizes vocabulary and syntax flow to ensure resumes score below 10% on AI content checkers while weaving key job keywords.
              </p>
              
              <ul className="mt-6 space-y-2.5 text-zinc-300 text-xs">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-violet-400" />
                  <span>Sentence variance (burstiness) humanizer</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-violet-400" />
                  <span>Local perplexity AI score generator</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-violet-400" />
                  <span>Keyword injections for ATS filters</span>
                </li>
              </ul>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/5">
              <Link 
                href={isAuthenticated ? "/dashboard" : "/auth/signin"}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-400 hover:text-violet-300"
              >
                Create Tailored Resume <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* Visual Workflow Section */}
      <section id="how-it-works" className="relative z-10 w-full max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 border-t border-white/5">
        <h2 className="text-center font-heading font-bold text-3xl text-white">The ShipOrDie Architecture</h2>
        <p className="text-center text-zinc-500 text-sm mt-2">How our agent pipelines run in the background</p>

        <div className="grid sm:grid-cols-3 gap-6 mt-12">
          <div className="glass-panel p-6 rounded-2xl">
            <span className="text-zinc-600 font-extrabold text-3xl">01</span>
            <h4 className="font-bold text-lg text-white mt-2">Scrape & Cluster</h4>
            <p className="text-zinc-400 text-xs mt-1">
              Agents parse Reddit, HN, and ProductHunt for customer pain points and cluster them using ChromaDB embeddings.
            </p>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            <span className="text-zinc-600 font-extrabold text-3xl">02</span>
            <h4 className="font-bold text-lg text-white mt-2">Humanize & Check</h4>
            <p className="text-zinc-400 text-xs mt-1">
              For resumes, Pass 2 randomizes syntax while Pass 3 runs unigram lexical entropy check to guarantee &lt;10% AI scores.
            </p>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            <span className="text-zinc-600 font-extrabold text-3xl">03</span>
            <h4 className="font-bold text-lg text-white mt-2">Export & Tailor</h4>
            <p className="text-zinc-400 text-xs mt-1">
              Download PDFs instantly, export docx Word sheets, or link a job description to tailor resumes on the fly.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 border-t border-white/5">
        <h2 className="text-center font-heading font-bold text-3xl text-white">Simple, Transparent Pricing</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mt-12">
          
          {/* Free Tier */}
          <div className="glass-panel p-8 rounded-3xl border border-white/5">
            <h4 className="text-lg font-bold text-zinc-400">Starter Plan</h4>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">₹0</span>
            </div>
            <p className="text-zinc-500 text-xs mt-2">Get started validation testing SaaS idea models.</p>
            
            <ul className="mt-6 space-y-3 text-sm text-zinc-300">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-400" />
                <span>3 Idea pipeline runs / month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-400" />
                <span>1 Resume generation / month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-400" />
                <span>Basic PDF exports</span>
              </li>
            </ul>
          </div>

          {/* Pro Tier */}
          <div className="glass-panel p-8 rounded-3xl border border-indigo-500/30 relative">
            <div className="absolute top-4 right-4 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 rounded-full">
              Recommended
            </div>
            <h4 className="text-lg font-bold text-indigo-400">Pro Plan</h4>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">₹499</span>
              <span className="text-zinc-500 text-xs">/ month</span>
            </div>
            <p className="text-zinc-500 text-xs mt-2">For founders launching projects and job seeking builders.</p>
            
            <ul className="mt-6 space-y-3 text-sm text-zinc-300">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-400" />
                <span><strong>Unlimited</strong> Idea generations</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-400" />
                <span><strong>10 Resumes / Month</strong> credits</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-400" />
                <span>Word DOCX & PDF exports</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-400" />
                <span>Resume version history diffs</span>
              </li>
            </ul>
          </div>

        </div>
      </section>

    </div>
  );
}
