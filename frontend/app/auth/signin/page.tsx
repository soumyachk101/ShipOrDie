"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "../../../store/useAppStore";
import { api } from "../../../lib/api";
import { Zap, Sparkles, LogIn } from "lucide-react";

export default function SignInPage() {
  const { setAuth } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleClient, setGoogleClient] = useState<any>(null);

  useEffect(() => {
    // Dynamic Google OAuth Script Loading
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const g = (window as any).google;
      if (g && g.accounts && g.accounts.oauth2) {
        const client = g.accounts.oauth2.initTokenClient({
          client_id: "515760672418-76m9ashhmnfi6nar4h2jtr0vqi4subu8.apps.googleusercontent.com",
          scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              setLoading(true);
              setError("");
              try {
                const res = await api.post("/api/auth/login", {
                  provider: "google",
                  token: tokenResponse.access_token
                });
                setAuth(res.token, res.user);
                window.location.href = "/dashboard";
              } catch (err) {
                setError("Google login verification failed.");
              } finally {
                setLoading(false);
              }
            }
          },
        });
        setGoogleClient(client);
      }
    };
    document.body.appendChild(script);
    return () => {
      // Clean up script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [setAuth]);

  const handleDemoLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/auth/login", {
        email: "demo@shipordie.ai",
        name: "Demo Founder",
        avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=demo",
        provider: "demo"
      });
      // Store in Zustand & local storage
      setAuth(res.token, res.user);
      // Route to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError("Failed to initialize session. Please check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSimulate = async (provider: string) => {
    setLoading(true);
    setError("");
    try {
      const email = provider === "google" ? "google_user@gmail.com" : "github_user@github.com";
      const name = provider === "google" ? "Google Explorer" : "GitHub Hacker";
      const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${provider}`;
      
      const res = await api.post("/api/auth/login", {
        email,
        name,
        avatar_url: avatar,
        provider
      });
      setAuth(res.token, res.user);
      window.location.href = "/dashboard";
    } catch (err) {
      setError("OAuth simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black px-4">
      {/* Background glow halos */}
      <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[80px]" />
      <div className="absolute bottom-[20%] right-[20%] w-[300px] h-[300px] rounded-full bg-violet-600/5 blur-[80px]" />

      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/5 relative z-10 shadow-2xl">
        
        {/* Title */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white mb-4">
            <Zap className="h-6 w-6" />
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-white">Welcome back</h2>
          <p className="text-zinc-500 text-sm mt-1">Sign in to validate ideas and tailors resumes.</p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-center text-xs text-rose-400">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-4">
          
          {/* Google Login */}
          <button 
            onClick={() => {
              if (googleClient) {
                googleClient.requestAccessToken();
              } else {
                handleOAuthSimulate("google");
              }
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 py-3.5 px-4 font-semibold text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            {/* Google G SVG */}
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.63 14.97 1 12 1 7.24 1 3.2 3.73 1.24 7.72l3.89 3.01C6.07 7.75 8.78 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.48c-.28 1.48-1.12 2.73-2.38 3.58l3.69 2.87c2.16-1.99 3.7-4.92 3.7-8.56z" />
              <path fill="#FBBC05" d="M5.13 10.73c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.24 3.14C.45 4.74 0 6.52 0 8.44c0 1.92.45 3.7 1.24 5.3l3.89-3.01z" />
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.69-2.87c-1.02.68-2.33 1.09-4.27 1.09-3.22 0-5.93-2.71-6.9-6.68L1.2 14.63C3.16 19.27 7.2 23 12 23z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* GitHub Login */}
          <button 
            onClick={() => handleOAuthSimulate("github")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 py-3.5 px-4 font-semibold text-white transition-all disabled:opacity-50"
          >
            <svg className="h-5 w-5 text-white fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            <span>Continue with GitHub</span>
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-zinc-600 text-xs uppercase tracking-widest font-semibold">Or bypass auth</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          {/* Demo Login (Instant access) */}
          <button 
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 py-4 px-4 font-bold text-white shadow-xl shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <LogIn className="h-4.5 w-4.5" />
            {loading ? "Initializing..." : "Use Demo Account (Recommended)"}
          </button>

        </div>

        <div className="mt-6 text-center">
          <span className="text-zinc-600 text-[10.5px] uppercase tracking-wider font-semibold">
            Zero configuration required for Demo Login.
          </span>
        </div>

      </div>
    </div>
  );
}
