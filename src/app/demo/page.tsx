'use client';

import React, { useState } from 'react';
import { Bug, Play, AlertTriangle, Shield, ChevronLeft, Eye, EyeOff, Loader2, Terminal } from 'lucide-react';
import Link from 'next/link';

type DemoState = 'idle' | 'loading' | 'error' | 'success';

export default function DemoApp() {
  const [email, setEmail] = useState('user@demo.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<DemoState>('idle');
  const [errorData, setErrorData] = useState<Record<string, string> | null>(null);
  const [consoleMessages, setConsoleMessages] = useState<Array<{ level: string; message: string; time: string }>>([]);

  const addConsole = (level: string, message: string) => {
    const time = new Date().toLocaleTimeString('en', { hour12: false });
    setConsoleMessages((prev) => [...prev, { level, message, time }]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    setErrorData(null);
    addConsole('log', `POST /api/demo/login { email: "${email}" }`);

    try {
      const startTime = Date.now();
      const res = await fetch('/api/demo/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo',
        },
        body: JSON.stringify({ email, password }),
      });

      const duration = Date.now() - startTime;
      const data = await res.json();

      if (!res.ok) {
        setState('error');
        setErrorData(data);
        addConsole('error', `POST /api/demo/login ${res.status} ${res.statusText} (${duration}ms)`);
        addConsole('error', data.message || data.error || 'Request failed');
        if (data.stack) {
          addConsole('error', data.stack);
        }
      } else {
        setState('success');
        addConsole('log', `Authentication successful (${duration}ms)`);
      }
    } catch (err) {
      setState('error');
      setErrorData({ error: 'Network error', message: String(err) });
      addConsole('error', `Network request failed: ${String(err)}`);
    }
  };

  const reset = () => {
    setState('idle');
    setErrorData(null);
    setConsoleMessages([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Dashboard</span>
            </Link>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-cyan-400" />
              <span className="font-bold">BUG<span className="text-cyan-400">{'//'}</span>BOX</span>
            </div>
          </div>

          <Link
            href="/capture"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Play className="w-4 h-4 fill-current" />
            Capture This Bug
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Instructions */}
        <div className="space-y-5">
          {/* Demo notice */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              Demo Application — Intentionally Broken
            </div>
            <p className="text-slate-400 text-sm">
              This login form is designed to fail deterministically. It demonstrates how BUG{'//'}BOX
              captures the HTTP 500 error, console output, and network failure automatically.
            </p>
          </div>

          {/* Step-by-step guide */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-200">Demo Flow</h2>
            <div className="space-y-3">
              {[
                { step: '1', title: 'Open Capture Mode', desc: 'Click "Capture This Bug" above to open BUG//BOX in capture mode', done: false },
                { step: '2', title: 'Start Recording', desc: 'Click "Start Capture" in BUG//BOX to begin recording events', done: false },
                { step: '3', title: 'Come Back Here', desc: 'Return to this Demo App tab', done: false },
                { step: '4', title: 'Trigger the Bug', desc: 'Click the login button — watch the HTTP 500 appear', done: false },
                { step: '5', title: 'Stop & Package', desc: 'Click "Stop & Package Bug" in BUG//BOX to create the Bug Box', done: false },
                { step: '6', title: 'Replay', desc: 'Click "Replay Bug" to watch the failure reproduce automatically', done: false },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security demo */}
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <Shield className="w-3.5 h-3.5" />
              Automatic Redaction Example
            </div>
            <p className="text-xs text-slate-400">The Authorization header sent with this request will be automatically redacted:</p>
            <div className="font-mono text-xs space-y-1">
              <div className="text-slate-500">Before:</div>
              <div className="text-rose-400/70 bg-slate-950 px-2 py-1 rounded">Authorization: Bearer eyJhbGci...</div>
              <div className="text-slate-500 mt-1">After redaction:</div>
              <div className="text-emerald-400 bg-slate-950 px-2 py-1 rounded">Authorization: [REDACTED]</div>
            </div>
          </div>
        </div>

        {/* Right: Login Form + Console */}
        <div className="space-y-4">
          {/* Login card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Card header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Bug className="w-4 h-4 text-slate-950" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-100">Demo Corp</h1>
                  <p className="text-xs text-slate-500">Sign in to your account</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-slate-400">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@demo.com"
                  required
                  disabled={state === 'loading'}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 disabled:opacity-60 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium text-slate-400">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    disabled={state === 'loading'}
                    className="w-full px-4 py-2.5 pr-10 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 disabled:opacity-60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error state */}
              {state === 'error' && errorData && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 space-y-1">
                  <div className="flex items-center gap-2 text-rose-400 text-sm font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    HTTP 500 — Internal Server Error
                  </div>
                  <p className="text-rose-300 text-xs">{errorData.message || errorData.error}</p>
                  {errorData.stack && (
                    <pre className="text-rose-400/60 text-[10px] font-mono overflow-auto max-h-20 mt-2 border-t border-rose-500/20 pt-2">
                      {errorData.stack}
                    </pre>
                  )}
                </div>
              )}

              {/* Success state */}
              {state === 'success' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 text-sm font-medium flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center">
                    <span className="text-slate-950 text-xs">✓</span>
                  </div>
                  Login successful!
                </div>
              )}

              <button
                type="submit"
                disabled={state === 'loading'}
                id="login-submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-500 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 disabled:shadow-none"
              >
                {state === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {state !== 'idle' && (
                <button
                  type="button"
                  onClick={reset}
                  className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Reset
                </button>
              )}
            </form>
          </div>

          {/* Console Panel */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-900/50">
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-mono text-slate-500">Console Output</span>
            </div>
            <div className="p-3 min-h-32 max-h-52 overflow-y-auto font-mono text-xs space-y-1">
              {consoleMessages.length === 0 ? (
                <p className="text-slate-700 italic">Waiting for requests…</p>
              ) : (
                consoleMessages.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-slate-700 flex-shrink-0">{msg.time}</span>
                    <span className={`flex-shrink-0 font-bold text-[10px] w-10 ${msg.level === 'error' ? 'text-rose-500' : 'text-slate-500'}`}>
                      [{msg.level.toUpperCase()}]
                    </span>
                    <span className={msg.level === 'error' ? 'text-rose-300' : 'text-slate-400'}>
                      {msg.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
