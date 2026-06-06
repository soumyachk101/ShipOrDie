"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import {
  User as UserIcon, Mail, Shield, Crown,
  AlertTriangle, LogOut, Zap, ExternalLink,
  CheckCircle
} from "lucide-react";

const subscribeToHydration = () => () => {};

export default function SettingsPage() {
  const { token, user, clearAuth } = useAppStore();
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    avatar_url: string;
    provider: string;
    tier: string;
    created_at?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  useEffect(() => {
    if (mounted && !token) {
      window.location.href = "/auth/signin";
    }
  }, [mounted, token]);

  useEffect(() => {
    if (token) {
      const timeout = window.setTimeout(() => {
        api.get("/api/auth/me")
          .then(data => setProfile(data))
          .catch(() => {
            if (user) {
              setProfile({
                name: user.name,
                email: user.email,
                avatar_url: user.avatar_url,
                provider: "demo",
                tier: user.tier,
              });
            }
          })
          .finally(() => setLoading(false));
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [token, user]);

  const handleSignOut = () => {
    clearAuth();
    window.location.href = "/";
  };

  const handleDeleteAccount = () => {
    if (deleteInput !== "DELETE") return;
    // In demo mode, just sign out
    clearAuth();
    alert("Account deleted (demo mode). You have been signed out.");
    window.location.href = "/";
  };

  if (!mounted || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex h-10 w-10 animate-spin items-center justify-center rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-9 border-b border-white/[0.07] pb-8">
        <p className="editorial-label">Workspace / settings</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-white sm:text-4xl">
          Settings
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Manage your profile, account preferences, and connected services.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Profile Section */}
          <div className="glass-panel rounded-2xl border-white/5 p-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-indigo-400" /> Profile
            </h2>

            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="shrink-0">
                <img
                  src={profile?.avatar_url || user?.avatar_url || ""}
                  alt={profile?.name || "User"}
                  className="h-16 w-16 rounded-2xl border border-white/10 bg-zinc-800 object-cover"
                />
              </div>

              <div className="flex-1 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
                    Full Name
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-2.5">
                    <UserIcon className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm text-white font-medium">
                      {profile?.name || user?.name || "—"}
                    </span>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
                    Email Address
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-2.5">
                    <Mail className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm text-zinc-300">
                      {profile?.email || user?.email || "—"}
                    </span>
                    <span className="ml-auto text-[9px] text-zinc-600 uppercase tracking-wider">
                      Read Only
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Section */}
          <div className="glass-panel rounded-2xl border-white/5 p-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-400" /> Account
            </h2>

            <div className="space-y-4">
              {/* Auth Provider */}
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3.5">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
                    Sign-in Method
                  </div>
                  <div className="mt-1 text-sm text-white font-medium capitalize flex items-center gap-2">
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                    {profile?.provider || "demo"} OAuth
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                  <CheckCircle className="h-3 w-3" /> Connected
                </span>
              </div>

              {/* Subscription Tier */}
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3.5">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
                    Subscription Tier
                  </div>
                  <div className="mt-1 text-sm text-white font-medium flex items-center gap-2">
                    {(profile?.tier || user?.tier) === "pro" ? (
                      <Crown className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 text-zinc-400" />
                    )}
                    {(profile?.tier || user?.tier || "free").toUpperCase()}
                  </div>
                </div>
                <a
                  href="/dashboard/billing"
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
                >
                  Manage →
                </a>
              </div>

              {/* Created Date */}
              {profile?.created_at && (
                <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3.5">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
                      Member Since
                    </div>
                    <div className="mt-1 text-sm text-zinc-300">
                      {new Date(profile.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Session Section */}
          <div className="glass-panel rounded-2xl border-white/5 p-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <LogOut className="h-4 w-4 text-indigo-400" /> Session
            </h2>
            <p className="text-zinc-500 text-xs mb-4">
              Sign out of your current session. You can always sign back in.
            </p>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 py-2.5 px-4 text-sm font-semibold text-zinc-300 transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>

          {/* Danger Zone */}
          <div className="glass-panel rounded-2xl border-rose-500/20 p-6">
            <h2 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </h2>
            <p className="text-zinc-500 text-xs mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 py-2.5 px-4 text-sm font-semibold text-rose-400 transition-colors"
              >
                <AlertTriangle className="h-4 w-4" /> Delete Account
              </button>
            ) : (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                <p className="text-sm text-rose-300 font-semibold mb-3">
                  Type <span className="font-mono bg-rose-500/15 px-1.5 py-0.5 rounded text-xs">DELETE</span> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full !border-rose-500/30 text-sm mb-3"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setDeleteConfirm(false);
                      setDeleteInput("");
                    }}
                    className="rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 py-2 px-4 text-sm font-semibold text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== "DELETE"}
                    className="rounded-xl bg-rose-500 hover:bg-rose-600 py-2 px-5 text-sm font-bold text-white disabled:opacity-30"
                  >
                    Permanently Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
