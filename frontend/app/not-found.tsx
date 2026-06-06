"use client";

import Link from "next/link";
import { Zap, ArrowLeft, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <div className="text-[8rem] sm:text-[10rem] font-heading font-extrabold tracking-[-0.08em] text-transparent bg-clip-text bg-gradient-to-b from-zinc-700 to-zinc-900 select-none leading-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Search className="h-7 w-7 text-indigo-400" />
              </div>
              <div className="absolute -inset-3 rounded-full border border-indigo-500/10 animate-ping" style={{ animationDuration: "3s" }} />
              <div className="absolute -inset-6 rounded-full border border-indigo-500/5 animate-ping" style={{ animationDuration: "4s" }} />
            </div>
          </div>
        </div>

        {/* Copy */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm text-zinc-500 leading-relaxed max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="premium-primary !min-h-11">
            <Home className="h-4 w-4" /> Go Home
          </Link>
          <Link href="/dashboard" className="premium-secondary !min-h-11">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>

        {/* Brand */}
        <div className="mt-12 flex items-center justify-center gap-2 text-zinc-700 text-xs">
          <img src="/logo_mark.png" alt="Logo" className="h-5 w-auto object-contain" />
          <span className="font-bold">ShipOr<span className="text-[#d8ff69]">Die</span></span>
        </div>
      </div>
    </div>
  );
}
