"use client";

import { signIn } from "next-auth/react";
import { Brain, Sparkles, Shield, Zap, BookOpen, ChevronRight } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#05050a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Glow Effects / Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-600/20 to-purple-600/0 blur-[120px] animate-pulse-glow" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-purple-600/20 to-pink-600/0 blur-[120px] animate-pulse-glow" style={{ animationDuration: '10s' }} />
      <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[80px] animate-float" style={{ animationDuration: '6s' }} />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg p-[1px] bg-gradient-to-b from-white/10 via-white/5 to-transparent rounded-3xl shadow-[0_0_50px_-12px_rgba(99,102,241,0.25)]">
        {/* Main Card */}
        <div className="backdrop-blur-2xl bg-black/40 rounded-[23px] p-8 md:p-10 border border-white/5">
          
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center p-[2px] rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] mb-5 group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-65 transition duration-500" />
              <div className="relative w-14 h-14 rounded-2xl bg-[#090910] flex items-center justify-center">
                <Brain className="w-7 h-7 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/60 mb-2">
              Knowledge Assistant
            </h1>
            <p className="text-sm text-indigo-200/50 max-w-sm mx-auto font-medium">
              Secure, AI-powered document intelligence and chat orchestration for your enterprise.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {[
              { icon: BookOpen, title: "Multi-Format Ingestion", desc: "Upload PDFs, DOCX, TXT, or web URLs.", color: "from-blue-500/20 to-blue-500/0", iconColor: "text-blue-400" },
              { icon: Sparkles, title: "Cited Responses", desc: "Precise answers mapped to source chunks.", color: "from-indigo-500/20 to-indigo-500/0", iconColor: "text-indigo-400" },
              { icon: Shield, title: "Enterprise Security", desc: "Multi-tenant workspace isolation.", color: "from-emerald-500/20 to-emerald-500/0", iconColor: "text-emerald-400" },
              { icon: Zap, title: "AI Agent Orchestrator", desc: "Smart routing & search categorization.", color: "from-amber-500/20 to-amber-500/0", iconColor: "text-amber-400" },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 hover:-translate-y-0.5"
              >
                {/* Accent glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <feature.icon className={`w-4 h-4 ${feature.iconColor}`} />
                    <h3 className="text-xs font-semibold text-white/90">{feature.title}</h3>
                  </div>
                  <p className="text-[11px] text-white/40 leading-normal">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="space-y-4">
            <button
              onClick={() => signIn("google", { callbackUrl: "/chat" })}
              className="relative w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white text-slate-950 font-bold text-sm hover:bg-slate-100 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-[0.98] cursor-pointer group"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continue with Google</span>
              <ChevronRight className="w-4 h-4 ml-1 opacity-50 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <p className="text-[10px] text-white/20 text-center">
              By accessing your workspace, you agree to our Terms and Data Privacy Policy.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
