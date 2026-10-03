import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Bug, Clock, Shield, Wifi, Terminal, Monitor, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  HIGH: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  MEDIUM: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  LOW: 'text-slate-400 bg-slate-800 border-slate-700',
};

export default async function SharedBugBoxPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Look up bug box by share token
  const { data: bugBox, error } = await supabase
    .from('bug_boxes')
    .select('*')
    .eq('share_token', token)
    .single();

  if (error || !bugBox) {
    notFound();
  }

  // Fetch session
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('bug_box_id', bugBox.id)
    .limit(1);

  const session = sessions?.[0] || null;

  const [
    { data: events },
    { data: networkEvents },
    { data: consoleEvents },
  ] = await Promise.all([
    session
      ? supabase.from('events').select('*').eq('session_id', session.id).order('timestamp')
      : Promise.resolve({ data: [] }),
    session
      ? supabase.from('network_events').select('*').eq('session_id', session.id).order('timestamp')
      : Promise.resolve({ data: [] }),
    session
      ? supabase.from('console_events').select('*').eq('session_id', session.id).order('timestamp')
      : Promise.resolve({ data: [] }),
  ]);

  const networkErrors = (networkEvents || []).filter((n) => n.status >= 400);
  const consoleErrors = (consoleEvents || []).filter((c) => c.level === 'error');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
              <Bug className="w-4 h-4 text-slate-950" />
            </div>
            <span className="font-black text-lg">BUG<span className="text-cyan-400">{'//'}</span>BOX</span>
          </Link>
          <span className="text-xs text-slate-500">Public Bug Report</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700">
              {bugBox.share_token?.toUpperCase()}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${SEVERITY_COLOR[bugBox.severity] || SEVERITY_COLOR.LOW}`}>
              {bugBox.severity}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(bugBox.created_at).toLocaleString()}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">{bugBox.title}</h1>
          {bugBox.description && (
            <p className="text-slate-400 text-sm">{bugBox.description}</p>
          )}
        </div>

        {/* Environment */}
        {session && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4">
              <Monitor className="w-4 h-4 text-cyan-400" />
              Environment
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              {[
                ['OS', session.os],
                ['Browser', session.browser],
                ['Viewport', session.viewport],
                ['Timezone', session.timezone],
              ].filter(([, v]) => v).map(([key, val]) => (
                <div key={String(key)} className="bg-slate-950 rounded-lg px-3 py-2 border border-slate-800">
                  <p className="text-slate-500 text-[10px] uppercase">{key}</p>
                  <p className="text-slate-300 mt-0.5 truncate">{String(val)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Network Errors */}
        {networkErrors.length > 0 && (
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-5">
            <h2 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4" />
              HTTP Failures ({networkErrors.length})
            </h2>
            <div className="space-y-2">
              {networkErrors.map((n, i) => (
                <div key={i} className="flex items-center gap-3 font-mono text-xs bg-rose-500/5 border border-rose-500/15 rounded-lg px-3 py-2">
                  <span className="text-rose-400 font-bold w-10">{n.method}</span>
                  <span className="text-slate-300 flex-1">{n.endpoint}</span>
                  <span className="text-rose-400 font-bold">HTTP {n.status}</span>
                  {n.duration && <span className="text-slate-500">{n.duration}ms</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Console Errors */}
        {consoleErrors.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-5">
            <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-4">
              <Terminal className="w-4 h-4" />
              Console Errors ({consoleErrors.length})
            </h2>
            <div className="space-y-2 font-mono text-xs">
              {consoleErrors.map((c, i) => (
                <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2 text-amber-300">
                  {c.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event Timeline */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4">
            <Wifi className="w-4 h-4 text-cyan-400" />
            Action Timeline ({(events || []).length} events)
          </h2>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {(events || []).map((event, i) => (
              <div key={i} className="flex items-center gap-3 font-mono text-xs hover:bg-slate-800/40 rounded px-2 py-1.5 transition-colors">
                <span className="text-slate-600 w-16 flex-shrink-0">
                  {new Date(event.timestamp).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-slate-400 font-bold w-16 flex-shrink-0">{event.type}</span>
                <span className="text-slate-300 truncate">{event.target || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
          <Shield className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-emerald-300">Sensitive Data Redacted</p>
            <p className="text-slate-400">
              All passwords, tokens, API keys, and credentials have been automatically redacted before storage and sharing.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 pt-4 border-t border-slate-800/60">
          <p>
            Generated by{' '}
            <Link href="/" className="text-cyan-400 hover:underline">BUG{'//'}BOX</Link>
            {' '}— Don&apos;t explain the bug. Package it.
          </p>
        </div>
      </main>
    </div>
  );
}
