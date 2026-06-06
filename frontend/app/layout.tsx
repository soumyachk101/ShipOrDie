"use client";

import "./globals.css";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "../store/useAppStore";
import { api } from "../lib/api";
import { Zap, CreditCard, Sparkles, BookOpen, Layers, LogOut, CheckCircle, X } from "lucide-react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { 
    token, 
    user, 
    clearAuth, 
    isUpgradeModalOpen, 
    setUpgradeModal, 
    updateUserCredits 
  } = useAppStore();

  const [activeTab, setActiveTab] = useState("ideas");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Poll billing status on load
  useEffect(() => {
    if (token) {
      api.get("/api/billing/status")
        .then((res) => {
          updateUserCredits(res.credits_remaining, res.resume_credits_remaining);
        })
        .catch(console.warn);
    }
  }, [token]);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await api.post("/api/billing/upgrade-demo");
      updateUserCredits(res.user.credits_remaining, res.user.resume_credits_remaining);
      // Update global user tier state directly in local storage & memory
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        u.tier = "pro";
        localStorage.setItem("user", JSON.stringify(u));
      }
      setUpgradeModal(false);
      alert("Successfully upgraded to PRO tier (Demo Mode)!");
      window.location.reload();
    } catch (e) {
      alert("Billing simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <html lang="en" className="h-full">
      <head>
        <title>ShipOrDie — Launch SaaS & ATS Resumes in Minutes</title>
        <meta name="description" content="AI Idea Engine validates Micro-SaaS ideas. AI Resume Builder generates ATS-optimized, undetectable resumes." />
      </head>
      <body className="min-h-full flex flex-col bg-black text-white font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/60 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 font-heading font-extrabold text-xl tracking-tight text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span>ShipOr<span className="text-indigo-400">Die</span></span>
              </Link>
              
              {mounted && token && (
                <nav className="hidden md:flex items-center gap-1">
                  <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/dashboard#ideas-section" className="px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                    Idea Engine
                  </Link>
                  <Link href="/dashboard#resume-section" className="px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                    Resume Builder
                  </Link>
                </nav>
              )}
            </div>

            {/* User widget */}
            <div className="flex items-center gap-4">
              {!mounted ? (
                <div className="h-9 w-20 animate-pulse bg-zinc-800 rounded-xl" />
              ) : token && user ? (
                <>
                  {/* Credits tracker */}
                  <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/5 bg-zinc-900/60 py-1.5 px-4 text-xs font-semibold text-zinc-400">
                    <span className="flex items-center gap-1 text-indigo-400">
                      <Sparkles className="h-3.5 w-3.5" />
                      Ideas: {user.tier === 'pro' ? 'Unlimited' : user.credits_remaining}
                    </span>
                    <span className="h-3 w-px bg-white/10" />
                    <span className="flex items-center gap-1 text-violet-400">
                      <BookOpen className="h-3.5 w-3.5" />
                      Resumes: {user.resume_credits_remaining}
                    </span>
                    <span className="h-3 w-px bg-white/10" />
                    <span className="text-zinc-500">Tier:</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                      user.tier === 'pro' ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {user.tier}
                    </span>
                  </div>

                  {user.tier !== 'pro' && (
                    <button 
                      onClick={() => setUpgradeModal(true)}
                      className="hidden md:flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 py-1.5 px-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/20"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Upgrade
                    </button>
                  )}

                  {/* Profile avatar */}
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.avatar_url} 
                      alt={user.name} 
                      className="h-8 w-8 rounded-full border border-white/10 bg-zinc-800"
                    />
                    <button 
                      onClick={() => {
                        clearAuth();
                        window.location.href = '/';
                      }}
                      className="rounded-xl border border-white/5 hover:border-white/15 p-2 text-zinc-400 hover:text-white transition-colors"
                      title="Sign Out"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <Link 
                  href="/auth/signin" 
                  className="rounded-xl bg-indigo-500 hover:bg-indigo-600 py-2 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all"
                >
                  Sign In
                </Link>
              )}
            </div>

          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col relative z-10">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-white/5 bg-zinc-950 py-8 text-center text-xs text-zinc-600">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} ShipOrDie. All rights reserved.</p>
            <p className="mt-1 text-zinc-700">Created by Soumya Chakraborty | Multi-Agent Niche SaaS builder.</p>
          </div>
        </footer>

        {/* Upgrade Modal overlay */}
        {isUpgradeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="glass-panel w-full max-w-md rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200">
              
              <button 
                onClick={() => setUpgradeModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white rounded-full bg-white/5 p-1.5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 mb-6">
                  <Sparkles className="h-6 w-6" />
                </div>
                
                <h3 className="font-heading font-extrabold text-2xl text-white">Upgrade to Pro</h3>
                <p className="text-zinc-400 mt-2 text-sm">Unlock the ultimate software packaging and application suite.</p>

                <div className="mt-6 space-y-3.5">
                  <div className="flex items-start gap-3 text-sm text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                    <span><strong>Unlimited</strong> Micro-SaaS Idea generation</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                    <span><strong>10 Resumes / Month</strong> credits quota</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                    <span><strong>Jinja2 PDF Export</strong> downloads</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                    <span><strong>Word DOCX export</strong> (fully ATS-compliant)</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                    <span><strong>Resume History</strong> & side-by-side tailored variants</span>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl bg-zinc-900/50 border border-white/5 p-4 text-center">
                  <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Pro Access</span>
                  <div className="mt-1 flex items-baseline justify-center gap-1.5">
                    <span className="font-heading font-extrabold text-3xl text-white">₹499</span>
                    <span className="text-zinc-400 text-sm">/ month</span>
                  </div>
                </div>

                <button 
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 py-3.5 px-4 font-bold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4" />
                  {loading ? 'Processing payment...' : 'Simulate Upgrade (Demo)'}
                </button>
              </div>

            </div>
          </div>
        )}

      </body>
    </html>
  );
}
