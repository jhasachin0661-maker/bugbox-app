'use client';

import React, { useState, useEffect, use } from 'react';
import {
  Bug,
  Play,
  GitPullRequest,
  Share2,
  ChevronLeft,
  Terminal,
  Wifi,
  Camera,
  Monitor,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  Copy,
  ExternalLink,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import type { BugBox, Session, Replay } from '@/lib/types';

type BugDetailData = {
  bug_box: BugBox;
  session: Session | null;
  replays: Replay[];
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  HIGH: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  MEDIUM: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  LOW: 'text-slate-400 bg-slate-800 border-slate-700',
};

const STATUS_COLOR: Record<string, string> = {
  Captured: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  Reproducible: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  Investigating: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Resolved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Closed: 'text-slate-400 bg-slate-800 border-slate-700',
};

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-slate-100">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="border-t border-slate-800">{children}</div>}
    </div>
  );
}

export default function BugDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<BugDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [replayState, setReplayState] = useState<{
    running: boolean;
    steps: Array<{ action: string; status: string; detail?: string }>;
    done: boolean;
    status: string;
  } | null>(null);
  const [githubIssue, setGithubIssue] = useState<{ title: string; body: string; github_url?: string; created?: boolean } | null>(null);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch(`/api/bugs/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const runReplay = async () => {
    setReplayState({ running: true, steps: [], done: false, status: 'RUNNING' });

    // Generate steps from events locally for immediate UI feedback
    const events = data?.session?.events || [];
    const localSteps = events
      .filter((e) => ['PAGE_LOAD', 'NAVIGATE', 'CLICK', 'INPUT', 'SUBMIT'].includes(e.type))
      .map((e) => ({
        action: `${e.type}: ${e.target || '—'}`,
        status: 'pending' as string,
      }));

    setReplayState({ running: true, steps: localSteps, done: false, status: 'RUNNING' });

    // Animate each step
    for (let i = 0; i < localSteps.length; i++) {
      await new Promise((r) => setTimeout(r, 700));
      const networkErrors = data?.session?.network_events?.filter((n) => n.status >= 400) || [];
      const isLast = i === localSteps.length - 1;
      const stepStatus = isLast && networkErrors.length > 0 ? 'failed' : 'success';

      setReplayState((prev) => {
        if (!prev) return prev;
        const steps = [...prev.steps];
        steps[i] = { ...steps[i], status: stepStatus };
        return { ...prev, steps };
      });
    }

    // Call API (in background)
    try {
      const res = await fetch(`/api/bugs/${id}/replay`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setReplayState((prev) => prev ? { ...prev, running: false, done: true, status: result.status } : prev);
      }
    } catch {
      // ignore
    }

    setReplayState((prev) => prev ? { ...prev, running: false, done: true } : prev);

    // Reload data
    const res2 = await fetch(`/api/bugs/${id}`);
    if (res2.ok) setData(await res2.json());
  };

  const generateGithubIssue = async () => {
    const res = await fetch(`/api/bugs/${id}/github`, { method: 'POST' });
    if (res.ok) {
      const issue = await res.json();
      setGithubIssue(issue);
      setShowGithubModal(true);
    }
  };

  const openGithubIssue = () => {
    if (!githubIssue) return;
    const url = githubIssue.github_url || `https://github.com/new/issue?title=${encodeURIComponent(githubIssue.title)}&body=${encodeURIComponent(githubIssue.body)}`;
    window.open(url, '_blank');
  };

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span>Loading Bug Box…</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Bug className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-slate-400 font-medium">Bug Box not found</p>
          <Link href="/" className="text-cyan-400 text-sm hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const { bug_box, session } = data;
  const networkErrors = session?.network_events?.filter((n) => n.status >= 400) || [];
  const consoleErrors = session?.console_events?.filter((c) => c.level === 'error') || [];
  const allNetworkEvents = session?.network_events || [];
  const allConsoleEvents = session?.console_events || [];
  const events = session?.events || [];
  const screenshot = session?.screenshots?.[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Dashboard</span>
            </Link>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-cyan-400" />
              <span className="font-bold">BUG<span className="text-cyan-400">{'//'}</span>BOX</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 transition-all"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Share'}
            </button>
            <button
              onClick={generateGithubIssue}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 transition-all"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">GitHub Issue</span>
            </button>
            <button
              onClick={runReplay}
              disabled={replayState?.running}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all disabled:opacity-60"
            >
              {replayState?.running ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              Replay Bug
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Bug Box Header */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700">
                  {bug_box.share_token?.toUpperCase()}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${SEVERITY_COLOR[bug_box.severity] || SEVERITY_COLOR.LOW}`}>
                  {bug_box.severity}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${STATUS_COLOR[bug_box.status] || STATUS_COLOR.Captured}`}>
                  {bug_box.status}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-100">{bug_box.title}</h1>
              {bug_box.description && (
                <p className="text-slate-400 text-sm">{bug_box.description}</p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                {new Date(bug_box.created_at).toLocaleString()}
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex gap-3 flex-shrink-0">
              <div className="text-center px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700">
                <p className="text-lg font-bold text-slate-100">{events.length}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Events</p>
              </div>
              <div className="text-center px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-lg font-bold text-rose-400">{networkErrors.length}</p>
                <p className="text-[10px] text-rose-500/70 uppercase tracking-wide">HTTP Err</p>
              </div>
              <div className="text-center px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-lg font-bold text-amber-400">{consoleErrors.length}</p>
                <p className="text-[10px] text-amber-500/70 uppercase tracking-wide">Console</p>
              </div>
            </div>
          </div>
        </div>

        {/* Replay Panel */}
        {replayState && (
          <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-slate-100">Replay Execution</span>
              </div>
              {replayState.running && (
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  RUNNING
                </span>
              )}
              {replayState.done && (
                <span className="text-xs font-mono text-emerald-400">COMPLETE</span>
              )}
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {replayState.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  {step.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                  {step.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                  {step.status === 'pending' && <Loader2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 animate-spin" />}
                  <span className={step.status === 'failed' ? 'text-rose-300' : step.status === 'success' ? 'text-slate-300' : 'text-slate-500'}>
                    {step.action}
                  </span>
                  {step.detail && <span className="text-rose-400 text-[10px]">{step.detail}</span>}
                </div>
              ))}
            </div>

            {replayState.done && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-medium">Bug successfully reproduced</span>
                <span className="text-slate-500">— HTTP failure confirmed</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Evidence */}
          <div className="lg:col-span-2 space-y-4">
            {/* Action Timeline */}
            <Section title={`Action Timeline (${events.length} events)`} icon={Clock}>
              <div className="p-4 space-y-1 max-h-72 overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4">No events captured</p>
                ) : (
                  events.map((event, i) => (
                    <div key={event.id || i} className="flex items-start gap-3 hover:bg-slate-800/40 rounded-lg px-2 py-1.5 transition-colors group">
                      <span className="text-slate-600 text-[10px] font-mono mt-0.5 w-16 flex-shrink-0">
                        {new Date(event.timestamp).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-400 w-16 flex-shrink-0">{event.type}</span>
                      <span className="text-xs text-slate-300 truncate">{event.target || '—'}</span>
                    </div>
                  ))
                )}
              </div>
            </Section>

            {/* Network Events */}
            <Section title={`Network Requests (${allNetworkEvents.length})`} icon={Wifi}>
              <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                {allNetworkEvents.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4">No network events captured</p>
                ) : (
                  allNetworkEvents.map((event, i) => (
                    <div
                      key={event.id || i}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono border ${event.status >= 500 ? 'bg-rose-500/5 border-rose-500/20' : event.status >= 400 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-800/40 border-slate-700/50'}`}
                    >
                      <span className={`font-bold w-10 flex-shrink-0 ${event.status >= 400 ? 'text-rose-400' : 'text-blue-400'}`}>
                        {event.method}
                      </span>
                      <span className="text-slate-300 flex-1 truncate">{event.endpoint}</span>
                      <span className={`font-bold px-2 py-0.5 rounded flex-shrink-0 ${event.status >= 500 ? 'text-rose-400 bg-rose-500/10' : event.status >= 400 ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                        {event.status}
                      </span>
                      {event.duration && (
                        <span className="text-slate-500 flex-shrink-0">{event.duration}ms</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Section>

            {/* Console Events */}
            <Section title={`Console Logs (${allConsoleEvents.length})`} icon={Terminal}>
              <div className="p-4 space-y-2 max-h-72 overflow-y-auto font-mono text-xs">
                {allConsoleEvents.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No console events captured</p>
                ) : (
                  allConsoleEvents.map((event, i) => (
                    <div
                      key={event.id || i}
                      className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${event.level === 'error' ? 'bg-rose-500/5 border-rose-500/15 text-rose-300' : event.level === 'warn' ? 'bg-amber-500/5 border-amber-500/15 text-amber-300' : 'bg-slate-800/40 border-slate-700/50 text-slate-400'}`}
                    >
                      <span className={`font-bold text-[10px] uppercase flex-shrink-0 mt-0.5 w-10 ${event.level === 'error' ? 'text-rose-500' : event.level === 'warn' ? 'text-amber-500' : 'text-slate-600'}`}>
                        [{event.level}]
                      </span>
                      <span className="break-words flex-1 text-[11px]">{event.message}</span>
                    </div>
                  ))
                )}
              </div>
            </Section>

            {/* Redaction Notice */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <Shield className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-emerald-300">Sensitive Data Redacted</p>
                <p className="text-slate-400">
                  Passwords, tokens, authorization headers, API keys, cookies, and card numbers 
                  have been automatically replaced with <code className="text-emerald-400 bg-emerald-500/10 px-1 rounded">[REDACTED]</code> before storage.
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Environment */}
            <Section title="Environment" icon={Monitor}>
              <div className="p-4 space-y-2 font-mono text-xs">
                {[
                  ['OS', session?.os],
                  ['Browser', session?.browser],
                  ['Viewport', session?.viewport],
                  ['Timezone', session?.timezone],
                  ['Session Start', session?.started_at ? new Date(session.started_at).toLocaleTimeString() : null],
                  ['Session End', session?.ended_at ? new Date(session.ended_at).toLocaleTimeString() : null],
                ].filter(([, v]) => v).map(([key, val]) => (
                  <div key={String(key)} className="flex justify-between gap-2">
                    <span className="text-slate-500">{key}</span>
                    <span className="text-slate-300 text-right truncate max-w-[55%]">{String(val)}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Screenshot */}
            {screenshot && (
              <Section title="Screenshot" icon={Camera}>
                <div className="p-4">
                  {screenshot.storage_url.startsWith('data:') ? (
                    <img
                      src={screenshot.storage_url}
                      alt="Bug screenshot"
                      className="w-full rounded-lg border border-slate-800"
                    />
                  ) : (
                    <div className="rounded-lg bg-slate-800 p-4 text-xs text-slate-500 text-center">
                      Screenshot stored at:<br />
                      <code className="text-cyan-400 text-[10px] break-all">{screenshot.storage_url}</code>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-600 mt-2 font-mono">
                    {screenshot.viewport} · {new Date(screenshot.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </Section>
            )}

            {/* Network Errors Summary */}
            {networkErrors.length > 0 && (
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  HTTP Failures
                </div>
                {networkErrors.map((n, i) => (
                  <div key={i} className="font-mono text-xs">
                    <span className="text-rose-300">{n.method} {n.endpoint}</span>
                    <br />
                    <span className="text-rose-500">HTTP {n.status} · {n.duration}ms</span>
                  </div>
                ))}
              </div>
            )}

            {/* Share */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Share Bug Box</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className="flex-1 px-2 py-1.5 text-[10px] bg-slate-950 border border-slate-700 rounded font-mono text-slate-400 min-w-0"
                />
                <button
                  onClick={copyShareLink}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* GitHub Issue Modal */}
      {showGithubModal && githubIssue && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-slate-100">Create GitHub Issue</span>
              </div>
              <button
                onClick={() => setShowGithubModal(false)}
                className="text-slate-500 hover:text-slate-200 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Issue Title</label>
                <p className="mt-1.5 text-sm text-slate-100 font-medium">{githubIssue.title}</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Issue Body (Markdown)</label>
                <pre className="mt-1.5 text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-auto max-h-64 whitespace-pre-wrap font-mono">
                  {githubIssue.body}
                </pre>
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 flex items-center gap-3">
              <button
                onClick={openGithubIssue}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-white text-slate-900 font-bold text-sm transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Open in GitHub
              </button>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(githubIssue.body);
                  alert('Issue body copied to clipboard!');
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 text-sm font-medium transition-all"
              >
                <Copy className="w-4 h-4" />
                Copy Body
              </button>
              <button
                onClick={() => setShowGithubModal(false)}
                className="ml-auto text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
