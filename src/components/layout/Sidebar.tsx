"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Brain,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface Conversation {
  _id: string;
  title: string;
  updatedAt: string;
}

interface SidebarProps {
  organizationId?: string;
  userId?: string;
  userName?: string;
  userImage?: string;
  userRole?: string;
}

export default function Sidebar({
  organizationId,
  userId,
  userName,
  userImage,
  userRole,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(() => {
    if (organizationId && userId) {
      fetchConversations();
    }
  }, [organizationId, userId]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(
        `/api/conversations?organizationId=${organizationId}&userId=${userId}`
      );
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const navItems = [
    { href: "/chat", icon: MessageSquare, label: "Chat", active: pathname.startsWith("/chat") },
    { href: "/documents", icon: FileText, label: "Documents", active: pathname === "/documents" },
    { href: "/dashboard", icon: BarChart3, label: "Dashboard", active: pathname === "/dashboard" },
    ...(userRole === "admin"
      ? [{ href: "/admin", icon: Settings, label: "Admin", active: pathname === "/admin" }]
      : []),
  ];

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "var(--accent-gradient)" }}>
          <Brain className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-bold text-sm text-white">Knowledge</h1>
            <p className="text-[10px] text-white/40">Enterprise AI</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-lg hover:bg-white/5 transition-colors hidden md:block"
        >
          {collapsed ? <ChevronRight className="w-4 h-4 text-white/40" /> : <ChevronLeft className="w-4 h-4 text-white/40" />}
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto p-1.5 rounded-lg hover:bg-white/5 transition-colors md:hidden"
        >
          <X className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Link
          href="/chat"
          className="w-full text-sm flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {!collapsed && "New Chat"}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="px-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              item.active
                ? "bg-white/8 text-white shadow-sm"
                : "text-white/50 hover:text-white/80 hover:bg-white/4"
            }`}
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span className="animate-fade-in">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Conversation History */}
      {!collapsed && (
        <div className="flex-1 mt-4 overflow-hidden flex flex-col animate-fade-in">
          <div className="px-4 mb-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-white/30 uppercase tracking-wider">
              <span>History</span>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 mb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white/3 border border-white/5 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/10 transition-colors"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {filteredConversations.map((conv) => (
              <div
                key={conv._id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                  pathname === `/chat/${conv._id}`
                    ? "bg-white/8 text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/3"
                }`}
              >
                <Link href={`/chat/${conv._id}`} className="flex-1 truncate">
                  {conv.title}
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    deleteConversation(conv._id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {filteredConversations.length === 0 && (
              <p className="text-[11px] text-white/20 px-3 py-4 text-center">
                No conversations yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* User Info */}
      <div className="p-3 border-t border-white/5 mt-auto">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/4 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden">
            {userImage ? (
              <img src={userImage} alt={userName || ""} className="w-full h-full object-cover" />
            ) : (
              userName?.[0]?.toUpperCase() || "U"
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-xs font-medium text-white/80 truncate">{userName || "User"}</p>
              <p className="text-[10px] text-white/30 capitalize">{userRole || "member"}</p>
            </div>
          )}
          {!collapsed && (
            <button 
              onClick={() => setShowSignOutConfirm(true)} 
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer bg-transparent border-0"
            >
              <LogOut className="w-3.5 h-3.5 text-white/30 hover:text-white/60" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors md:hidden"
      >
        <Menu className="w-5 h-5 text-white/70" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 bg-[#090912]/95 border-r border-white/5 backdrop-blur-2xl transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "280px" }}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col h-screen bg-[#090912]/80 border-r border-white/5 backdrop-blur-2xl transition-all duration-300 flex-shrink-0 ${
          collapsed ? "w-[68px]" : "w-[260px]"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowSignOutConfirm(false)}
        >
          <div 
            className="w-full max-w-sm p-6 bg-[#0c0c16]/95 border border-white/10 rounded-2xl shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white mb-2">
              Sign Out
            </h3>
            <p className="text-xs text-white/50 mb-6">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 px-4 py-2.5 text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex-1 px-4 py-2.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/20 transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
