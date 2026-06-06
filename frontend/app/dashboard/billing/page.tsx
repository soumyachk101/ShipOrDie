"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import {
  CreditCard, Sparkles, CheckCircle, Zap,
  ArrowRight, Shield, Crown, X,
  TrendingUp, FileText, Layers, AlertTriangle
} from "lucide-react";

const subscribeToHydration = () => () => {};

interface BillingStatus {
  tier: string;
  credits_remaining: number;
  resume_credits_remaining: number;
}

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    accent: "zinc",
    icon: Zap,
    features: [
      "3 idea generation credits",
      "1 resume credit / month",
      "PDF export",
      "Basic templates",
    ],
    limitations: [
      "No DOCX export",
      "No bulk export",
      "Limited history",
    ],
  },
  {
    name: "Pro",
    price: "₹499",
    period: "/ month",
    accent: "indigo",
    icon: Crown,
    popular: true,
    features: [
      "Unlimited idea generation",
      "10 resume credits / month",
      "PDF + DOCX export",
      "All premium templates",
      "Resume history & versioning",
      "Side-by-side diff view",
      "Priority support",
    ],
    limitations: [],
  },
  {
    name: "Team",
    price: "₹1,499",
    period: "/ month",
    accent: "violet",
    icon: Shield,
    features: [
      "Everything in Pro",
      "Unlimited resume credits",
      "Shared workspace",
      "Team collaboration",
      "API access",
      "Custom templates",
      "Dedicated support",
    ],
    limitations: [],
  },
];

export default function BillingPage() {
  const { token, user, setUpgradeModal, updateUserCredits } = useAppStore();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  useEffect(() => {
    if (mounted && !token) {
      window.location.href = "/auth/signin";
    }
  }, [mounted, token]);

  useEffect(() => {
    if (token) {
      const timeout = window.setTimeout(() => {
        api.get("/api/billing/status")
          .then((data: BillingStatus) => {
            setBilling(data);
            updateUserCredits(data.credits_remaining, data.resume_credits_remaining);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [token]);

  const handleUpgrade = async (plan: string) => {
    setUpgrading(true);
    try {
      const res = await api.post("/api/billing/upgrade-demo");
      updateUserCredits(res.user.credits_remaining, res.user.resume_credits_remaining);
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        u.tier = "pro";
        localStorage.setItem("user", JSON.stringify(u));
      }
      setBilling({
        tier: "pro",
        credits_remaining: res.user.credits_remaining,
        resume_credits_remaining: res.user.resume_credits_remaining,
      });
      alert("Successfully upgraded to PRO tier (Demo Mode)!");
      window.location.reload();
    } catch {
      alert("Billing simulation failed.");
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.delete("/api/billing/cancel");
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        u.tier = "free";
        localStorage.setItem("user", JSON.stringify(u));
      }
      alert("Subscription cancelled. Reverted to Free tier.");
      window.location.reload();
    } catch {
      alert("Failed to cancel subscription.");
    } finally {
      setCancelling(false);
      setCancelConfirm(false);
    }
  };

  if (!mounted || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex h-10 w-10 animate-spin items-center justify-center rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const currentTier = billing?.tier || user?.tier || "free";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-9 flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="editorial-label">Workspace / billing</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-white sm:text-4xl">
            Credits & Billing
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Manage your subscription, track credit usage, and upgrade for unlimited access.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Current Credits Overview */}
          <div className="dashboard-stat-line mb-12">
            <div className="dashboard-stat">
              <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Current Plan</div>
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold ${
                  currentTier === "pro"
                    ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300"
                    : currentTier === "team"
                    ? "bg-violet-500/15 border border-violet-500/30 text-violet-300"
                    : "bg-zinc-800 text-zinc-300"
                }`}>
                  {currentTier === "pro" && <Crown className="h-3.5 w-3.5" />}
                  {currentTier === "team" && <Shield className="h-3.5 w-3.5" />}
                  {currentTier.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="dashboard-stat">
              <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Idea Credits</div>
              <div className="mt-2 text-2xl font-extrabold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                {currentTier === "pro" || currentTier === "team" ? "∞" : billing?.credits_remaining ?? 0}
              </div>
              <div className="text-zinc-600 text-[10.5px] mt-1">
                {currentTier === "free" ? "3 included with free tier" : "Unlimited with paid plan"}
              </div>
            </div>

            <div className="dashboard-stat">
              <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Resume Credits</div>
              <div className="mt-2 text-2xl font-extrabold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-400" />
                {billing?.resume_credits_remaining ?? 0}
              </div>
              <div className="text-zinc-600 text-[10.5px] mt-1">
                {currentTier === "free" ? "1 per month" : currentTier === "pro" ? "10 per month" : "Unlimited"}
              </div>
            </div>

            <div className="dashboard-stat dashboard-stat-account">
              <div>
                <div className="text-indigo-400 text-xs uppercase tracking-wider font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Usage This Month
                </div>
                <p className="text-zinc-400 text-xs mt-2">
                  Credits refresh monthly on billing date.
                </p>
              </div>
              {currentTier !== "free" && (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="mt-3 text-xs text-zinc-500 hover:text-rose-400 transition-colors underline underline-offset-4"
                >
                  Cancel subscription
                </button>
              )}
            </div>
          </div>

          {/* Plan Comparison */}
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-white tracking-tight">Choose Your Plan</h2>
            <p className="text-zinc-500 text-sm mt-1">
              Unlock the full power of multi-agent idea generation and AI resume building.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {plans.map(plan => {
              const isCurrent = plan.name.toLowerCase() === currentTier;
              const Icon = plan.icon;

              return (
                <div
                  key={plan.name}
                  className={`glass-panel p-6 rounded-2xl flex flex-col justify-between relative transition-all ${
                    plan.popular
                      ? "border-indigo-500/30 ring-1 ring-indigo-500/20"
                      : "border-white/5"
                  } ${isCurrent ? "ring-2 ring-indigo-500/40" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        plan.popular
                          ? "bg-indigo-500/10 text-indigo-400"
                          : plan.accent === "violet"
                          ? "bg-violet-500/10 text-violet-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1.5 mb-6">
                      <span className="font-heading font-extrabold text-3xl text-white">{plan.price}</span>
                      <span className="text-zinc-500 text-sm">{plan.period}</span>
                    </div>

                    <div className="space-y-3">
                      {plan.features.map(feature => (
                        <div key={feature} className="flex items-start gap-2.5 text-sm text-zinc-300">
                          <CheckCircle className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                      {plan.limitations.map(limitation => (
                        <div key={limitation} className="flex items-start gap-2.5 text-sm text-zinc-500">
                          <X className="h-4 w-4 text-zinc-600 mt-0.5 shrink-0" />
                          <span>{limitation}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8">
                    {isCurrent ? (
                      <div className="w-full flex items-center justify-center gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 py-3 px-4 text-sm font-bold text-indigo-400">
                        <CheckCircle className="h-4 w-4" /> Current Plan
                      </div>
                    ) : plan.name === "Free" ? (
                      <div className="w-full flex items-center justify-center rounded-2xl border border-white/5 bg-white/5 py-3 px-4 text-sm font-semibold text-zinc-500">
                        Included
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.name.toLowerCase())}
                        disabled={upgrading}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 py-3 px-4 font-bold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 text-sm"
                      >
                        <CreditCard className="h-4 w-4" />
                        {upgrading ? "Processing..." : `Upgrade to ${plan.name}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAQ / Info */}
          <div className="glass-panel rounded-2xl border-white/5 p-8">
            <h3 className="font-bold text-white text-lg mb-4">Billing FAQ</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-zinc-300 mb-1">How do credits work?</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Each idea generation run costs 1 credit. Each resume generation costs 1 resume credit.
                  Credits refresh monthly on your billing date.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-300 mb-1">Can I cancel anytime?</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Yes. Cancel anytime and keep access until the end of your billing period.
                  You will revert to the Free tier after that.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-300 mb-1">What payment methods?</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  We accept all UPI, credit cards, debit cards, and net banking via Razorpay.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-300 mb-1">What happens if I run out?</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  You can upgrade your plan anytime for more credits. Free tier users can upgrade
                  to Pro for unlimited idea generation.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="font-heading font-extrabold text-xl text-white">Cancel Subscription?</h3>
            <p className="text-zinc-400 text-sm mt-2">
              You will lose access to Pro features at the end of your current billing period.
              Your data will be preserved.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setCancelConfirm(false)}
                className="rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 py-2 px-4 text-sm font-semibold text-zinc-300"
              >
                Keep Plan
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded-xl bg-rose-500 hover:bg-rose-600 py-2 px-5 text-sm font-bold text-white disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
