'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bug,
  Play,
  ShieldCheck,
  GitPullRequest,
  Activity,
  Clock,
  AlertTriangle,
  Share2,
  Terminal,
  Search,
  Filter,
  Plus,
  ChevronRight,
  Wifi,
  Eye,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import type { BugBox } from '@/lib/types';

const SEVERITY_CONFIG = {
  CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  LOW: 'bg-slate-700 text-slate-400 border-slate-600',
};

const STATUS_CONFIG = {
  Captured: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Reproducible: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Investigating: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Closed: 'bg-slate-700 text-slate-400 border-slate-600',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Dashboard() {
  const [bugBoxes, setBugBoxes] = useState<BugBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, reproducible: 0, resolved: 0, critical: 0 });

  const fetchBugBoxes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      if (severityFilter) params.set('severity', severityFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/bugs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const boxes: BugBox[] = data.bug_boxes || [];
        setBugBoxes(boxes);
        setStats({
          total: boxes.length,
          reproducible: boxes.filter((b) => b.status === 'Reproducible').length,
          resolved: boxes.filter((b) => b.status === 'Resolved').length,
          critical: boxes.filter((b) => b.severity === 'CRITICAL').length,
        });
      }
    } catch (err) {
      console.error('Failed to fetch bug boxes:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, severityFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBugBoxes();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchBugBoxes]);

  const copyShareLink = async (shareToken: string) => {
    const url = `${window.location.origin}/b/${shareToken}`;
    await navigator.clipboard.writeText(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Bug className="w-5 h-5 text-slate-950" />
            </div>
            <span className="text-xl font-black tracking-tight">
              BUG<span className="text-cyan-400">{'//'}</span>BOX
            </span>
            <span className="hidden sm:inline text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              v1.0
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-sm text-slate-400">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-100 font-medium">Dashboard</span>
            <Link href="/capture" className="px-3 py-1.5 rounded-lg hover:bg-slate-800/60 hover:text-slate-200 transition-colors">Capture</Link>
            <Link href="/demo" className="px-3 py-1.5 rounded-lg hover:bg-slate-800/60 hover:text-slate-200 transition-colors">Demo App</Link>
          </nav>

          <Link
            href="/capture"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Capture</span>
            <span className="sm:hidden">Capture</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              EVIDENCE PLATFORM
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">
              Don&apos;t explain the bug.{' '}
              <span className="text-cyan-400">Package it.</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Capture action timelines, console errors, network failures and environment details
              into a sanitized, reproducible Bug Box that developers can replay.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/capture"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Capturing
              </Link>
              <Link
                href="/demo"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-slate-100 font-semibold text-sm transition-all"
              >
                <Eye className="w-4 h-4" />
                Try Demo App
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Bug Boxes', value: loading ? '—' : String(stats.total), icon: Bug, color: 'text-cyan-400', glow: 'shadow-cyan-500/10' },
            { label: 'Reproducible', value: loading ? '—' : String(stats.reproducible), icon: Activity, color: 'text-violet-400', glow: 'shadow-violet-500/10' },
            { label: 'Critical', value: loading ? '—' : String(stats.critical), icon: AlertTriangle, color: 'text-rose-400', glow: 'shadow-rose-500/10' },
            { label: 'Resolved', value: loading ? '—' : String(stats.resolved), icon: ShieldCheck, color: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
          ].map((stat, i) => (
            <div
              key={i}
              className={`bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex items-center justify-between backdrop-blur-sm shadow-lg ${stat.glow}`}
            >
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color} opacity-70`} />
            </div>
          ))}
        </div>

        {/* Bug Boxes Section */}
        <div className="space-y-4">
          {/* Header + Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Bug Boxes
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 w-44"
                />
              </div>

              {/* Status filter */}
              <div className="relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="Captured">Captured</option>
                  <option value="Reproducible">Reproducible</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              {/* Severity filter */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Bug Box List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 animate-pulse">
                  <div className="h-4 bg-slate-800 rounded w-1/4 mb-3" />
                  <div className="h-5 bg-slate-800 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : bugBoxes.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
              <Bug className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No bug boxes yet</p>
              <p className="text-slate-600 text-sm mt-1 mb-5">Start capturing your first bug session.</p>
              <Link
                href="/capture"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Capture
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {bugBoxes.map((box) => (
                <div
                  key={box.id}
                  className="group bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-sm transition-all"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                        {box.share_token?.toUpperCase().slice(0, 8) || box.id.slice(0, 8)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium border ${SEVERITY_CONFIG[box.severity] || SEVERITY_CONFIG.LOW}`}>
                        {box.severity}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium border ${STATUS_CONFIG[box.status] || STATUS_CONFIG.Captured}`}>
                        {box.status}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(box.created_at)}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                      {box.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/bugs/${box.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>
                    <Link
                      href={`/bugs/${box.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Replay
                    </Link>
                    <button
                      onClick={() => copyShareLink(box.share_token)}
                      title="Copy share link"
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800/60">
          {[
            { icon: Terminal, label: 'Console Capture', desc: 'log, warn, error' },
            { icon: Wifi, label: 'Network Capture', desc: 'HTTP status + duration' },
            { icon: ShieldCheck, label: 'Auto-Redaction', desc: 'Tokens, passwords, keys' },
            { icon: GitPullRequest, label: 'GitHub Issues', desc: 'One-click creation' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <f.icon className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-300">{f.label}</p>
                <p className="text-xs text-slate-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
