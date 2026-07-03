"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  MessageSquare,
  Clock,
  HardDrive,
  TrendingUp,
  BarChart3,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatFileSize } from "@/lib/utils";

interface DashboardProps {
  organizationId: string;
}

export default function DashboardClient({ organizationId }: DashboardProps) {
  const [analytics, setAnalytics] = useState<{
    totalDocuments: number;
    totalQueries: number;
    avgResponseTime: number;
    storageUsed: number;
    storageLimit: number;
    queriesOverTime: { date: string; count: number }[];
    popularDocuments: { title: string; queryCount: number }[];
    responseLatency: { range: string; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [organizationId]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(
        `/api/admin/analytics?organizationId=${organizationId}`
      );
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 h-28 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-6 h-80 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const storagePercent = analytics
    ? Math.round((analytics.storageUsed / analytics.storageLimit) * 100)
    : 0;

  const statCards = [
    {
      icon: FileText,
      label: "Documents",
      value: analytics?.totalDocuments || 0,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: MessageSquare,
      label: "Total Queries",
      value: analytics?.totalQueries || 0,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
    },
    {
      icon: Clock,
      label: "Avg Response",
      value: `${((analytics?.avgResponseTime || 0) / 1000).toFixed(1)}s`,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      icon: HardDrive,
      label: "Storage",
      value: formatFileSize(analytics?.storageUsed || 0),
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      extra: `${storagePercent}%`,
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Dashboard
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Overview of your knowledge base activity
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <div
              key={i}
              className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                {stat.extra && (
                  <span className="text-[11px] text-white/30">{stat.extra}</span>
                )}
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-[11px] text-white/30 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Queries Over Time */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white/70">Queries Over Time</h3>
            </div>
            {analytics?.queriesOverTime && analytics.queriesOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={analytics.queriesOverTime}>
                  <defs>
                    <linearGradient id="queryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                    tickFormatter={(v) => v.split("-").slice(1).join("/")}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(20,20,35,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#818cf8"
                    fill="url(#queryGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-white/15 text-sm">
                No query data yet
              </div>
            )}
          </div>

          {/* Popular Documents */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-semibold text-white/70">Popular Documents</h3>
            </div>
            {analytics?.popularDocuments && analytics.popularDocuments.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.popularDocuments.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis
                    type="number"
                    tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                    width={120}
                    tickFormatter={(v) => (v.length > 18 ? v.slice(0, 18) + "..." : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(20,20,35,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="queryCount" fill="#818cf8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-white/15 text-sm">
                No document activity yet
              </div>
            )}
          </div>
        </div>

        {/* Storage Bar */}
        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white/70">Storage Usage</h3>
            </div>
            <span className="text-xs text-white/30">
              {formatFileSize(analytics?.storageUsed || 0)} / {formatFileSize(analytics?.storageLimit || 0)}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(storagePercent, 100)}%`,
                background: storagePercent > 80 ? "#f87171" : "linear-gradient(90deg, #818cf8, #a78bfa)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
