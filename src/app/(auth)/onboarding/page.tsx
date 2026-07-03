"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Building2, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to create workspace");
      }

      // Force NextAuth to refresh the JWT session token with the new organizationId
      await update();

      // Navigate to chat now that organizationId is present and middleware won't block
      router.push("/chat");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    setError("");

    try {
      // Auto-create a default workspace name using user's name
      const defaultName = session?.user?.name
        ? `${session.user.name}'s Workspace`
        : "My Workspace";

      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: defaultName }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to create workspace");
      }

      // Refresh the session token
      await update();

      router.push("/chat");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05050a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Glow Effects / Background Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-600/20 to-purple-600/0 blur-[120px] animate-pulse-glow" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-purple-600/20 to-pink-600/0 blur-[120px] animate-pulse-glow" style={{ animationDuration: '10s' }} />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-[1px] bg-gradient-to-b from-white/10 via-white/5 to-transparent rounded-3xl shadow-[0_0_50px_-12px_rgba(99,102,241,0.25)]">
        {/* Main Card */}
        <div className="backdrop-blur-2xl bg-black/40 rounded-[23px] p-8 md:p-10 border border-white/5">
          
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center p-[2px] rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] mb-5 group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-65 transition duration-500" />
              <div className="relative w-14 h-14 rounded-2xl bg-[#090910] flex items-center justify-center">
                <Building2 className="w-7 h-7 text-indigo-400" />
              </div>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/60 mb-2">
              Set Up Workspace
            </h1>
            <p className="text-sm text-indigo-200/50 max-w-sm mx-auto font-medium">
              Create a dedicated secure workspace for your organization's files and chats.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[11px] text-white/30 uppercase tracking-wider mb-2 block font-semibold">
                Organization / Workspace Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Corporation"
                className="w-full px-4 py-3 text-sm rounded-xl bg-white/3 border border-white/5 text-white/80 placeholder:text-white/20 focus:outline-none focus:border-indigo-500/30 transition-colors"
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 text-center font-medium">
                {error}
              </p>
            )}

            <div className="space-y-4">
              <button
                type="submit"
                disabled={loading || !orgName.trim()}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white text-slate-950 font-bold text-sm hover:bg-slate-100 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Setting up workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Workspace</span>
                    <ArrowRight className="w-4 h-4 ml-1 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="w-full text-xs text-white/30 hover:text-white/50 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip configuration for now →
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
