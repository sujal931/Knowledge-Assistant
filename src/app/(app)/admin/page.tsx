import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Settings, Users, Key, Shield } from "lucide-react";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/chat");

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="w-6 h-6 text-indigo-400" />
            Admin Settings
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Manage your organization settings
          </p>
        </div>

        <div className="space-y-6">
          {/* Organization Info */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
            <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              Organization
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-white/30 uppercase tracking-wider">
                  Organization Name
                </label>
                <input
                  type="text"
                  defaultValue="My Workspace"
                  className="mt-1 w-full px-4 py-2.5 text-sm rounded-xl bg-white/3 border border-white/5 text-white/80 focus:outline-none focus:border-white/10"
                />
              </div>
              <div>
                <label className="text-[11px] text-white/30 uppercase tracking-wider">
                  Plan
                </label>
                <div className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Free Plan
                </div>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
            <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-yellow-400" />
              API Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-white/30 uppercase tracking-wider">
                  Groq API Key
                </label>
                <input
                  type="password"
                  defaultValue="••••••••••••"
                  className="mt-1 w-full px-4 py-2.5 text-sm rounded-xl bg-white/3 border border-white/5 text-white/80 focus:outline-none focus:border-white/10"
                />
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
            <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-green-400" />
              Members
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                    {session.user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-sm text-white/80">{session.user.name}</p>
                    <p className="text-[11px] text-white/30">{session.user.email}</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Admin
                </span>
              </div>
            </div>
            <button className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs mt-4 transition-colors cursor-pointer">
              Invite Member
            </button>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
