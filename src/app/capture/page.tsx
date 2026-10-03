'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bug,
  Play,
  Square,
  ChevronLeft,
  AlertTriangle,
  Terminal,
  Activity,
  Wifi,
  Camera,
  Clock,
  Monitor,
  CheckCircle2,
  Loader2,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import type {
  CaptureEvent,
  CaptureNetworkEvent,
  CaptureConsoleEvent,
  Severity,
} from '@/lib/types';

interface LiveEvent {
  id: string;
  timestamp: string;
  type: string;
  target: string | null;
  detail?: string;
  category: 'action' | 'network' | 'console';
  severity?: 'error' | 'warn' | 'info' | 'log';
  status?: number;
}

function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return `Chrome ${ua.match(/Chrome\/(\d+)/)?.[1] || ''}`;
  if (ua.includes('Firefox')) return `Firefox ${ua.match(/Firefox\/(\d+)/)?.[1] || ''}`;
  if (ua.includes('Safari') && !ua.includes('Chrome')) return `Safari ${ua.match(/Version\/(\d+)/)?.[1] || ''}`;
  if (ua.includes('Edg')) return `Edge ${ua.match(/Edg\/(\d+)/)?.[1] || ''}`;
  return 'Unknown Browser';
}

function getOSInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows NT 10.0')) return 'Windows 11/10';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS X')) return `macOS ${ua.match(/Mac OS X ([0-9_]+)/)?.[1]?.replace(/_/g, '.') || ''}`;
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return `Android ${ua.match(/Android (\d+)/)?.[1] || ''}`;
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown OS';
}

export default function CapturePage() {
  const router = useRouter();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [captureUrl, setCaptureUrl] = useState('');
  const [severity, setSeverity] = useState<Severity>('HIGH');
  const [description, setDescription] = useState('');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [hasScreenshot, setHasScreenshot] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);

  // Raw capture data
  const capturedEvents = useRef<CaptureEvent[]>([]);
  const capturedNetwork = useRef<CaptureNetworkEvent[]>([]);
  const capturedConsole = useRef<CaptureConsoleEvent[]>([]);
  const sessionStart = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const originalFetch = useRef<typeof fetch | null>(null);
  const originalConsoleError = useRef<typeof console.error | null>(null);
  const originalConsoleWarn = useRef<typeof console.warn | null>(null);
  const originalConsoleLog = useRef<typeof console.log | null>(null);
  const eventsListRef = useRef<HTMLDivElement>(null);

  const addLiveEvent = useCallback((event: Omit<LiveEvent, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    setLiveEvents((prev) => [...prev.slice(-49), { ...event, id }]);
  }, []);

  const startCapture = useCallback(() => {
    capturedEvents.current = [];
    capturedNetwork.current = [];
    capturedConsole.current = [];
    setLiveEvents([]);
    setIsCapturing(true);
    setSessionDuration(0);
    setHasScreenshot(false);
    setScreenshotDataUrl(null);
    sessionStart.current = new Date();

    // Start timer
    timerRef.current = setInterval(() => {
      setSessionDuration((d) => d + 1);
    }, 1000);

    // Capture initial page load
    const pageEvent: CaptureEvent = {
      timestamp: new Date().toISOString(),
      type: 'PAGE_LOAD',
      target: window.location.pathname,
      metadata: { url: window.location.href, title: document.title },
    };
    capturedEvents.current.push(pageEvent);
    addLiveEvent({
      timestamp: pageEvent.timestamp,
      type: 'PAGE_LOAD',
      target: window.location.pathname,
      detail: document.title,
      category: 'action',
    });

    // Intercept fetch
    originalFetch.current = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const startTime = Date.now();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      const method = (init?.method || 'GET').toUpperCase();

      try {
        const response = await originalFetch.current!(input, init);
        const duration = Date.now() - startTime;
        const netEvent: CaptureNetworkEvent = {
          timestamp: new Date().toISOString(),
          method,
          endpoint: url.replace(window.location.origin, '') || url,
          status: response.status,
          duration,
          headers: init?.headers
            ? Object.fromEntries(Object.entries(init.headers as Record<string, string>))
            : undefined,
        };
        capturedNetwork.current.push(netEvent);
        addLiveEvent({
          timestamp: netEvent.timestamp,
          type: method,
          target: netEvent.endpoint,
          detail: `${response.status} · ${duration}ms`,
          category: 'network',
          status: response.status,
          severity: response.status >= 500 ? 'error' : response.status >= 400 ? 'warn' : 'info',
        });
        return response;
      } catch (err) {
        const duration = Date.now() - startTime;
        const netEvent: CaptureNetworkEvent = {
          timestamp: new Date().toISOString(),
          method,
          endpoint: url.replace(window.location.origin, '') || url,
          status: 0,
          duration,
        };
        capturedNetwork.current.push(netEvent);
        addLiveEvent({
          timestamp: netEvent.timestamp,
          type: method,
          target: netEvent.endpoint,
          detail: `Failed · ${duration}ms`,
          category: 'network',
          status: 0,
          severity: 'error',
        });
        throw err;
      }
    };

    // Intercept console
    const interceptConsole = (level: 'log' | 'info' | 'warn' | 'error') => {
      const orig = console[level];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console[level] = (...args: any[]) => {
        orig.apply(console, args);
        const message = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        const consoleEvent: CaptureConsoleEvent = {
          timestamp: new Date().toISOString(),
          level,
          message,
        };
        capturedConsole.current.push(consoleEvent);
        if (level === 'error' || level === 'warn') {
          addLiveEvent({
            timestamp: consoleEvent.timestamp,
            type: level.toUpperCase(),
            target: null,
            detail: message.slice(0, 120),
            category: 'console',
            severity: level === 'error' ? 'error' : 'warn',
          });
        }
      };
      return orig;
    };
    originalConsoleError.current = interceptConsole('error');
    originalConsoleWarn.current = interceptConsole('warn');
    originalConsoleLog.current = interceptConsole('log');

    // DOM event listeners
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const selector = target.id ? `#${target.id}` : target.className ? `.${target.className.split(' ').join('.')}` : target.tagName.toLowerCase();
      const text = (target.textContent || '').trim().slice(0, 50);
      const event: CaptureEvent = {
        timestamp: new Date().toISOString(),
        type: 'CLICK',
        target: selector,
        metadata: { text, tagName: target.tagName },
      };
      capturedEvents.current.push(event);
      addLiveEvent({
        timestamp: event.timestamp,
        type: 'CLICK',
        target: selector,
        detail: text || undefined,
        category: 'action',
      });
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const inputType = target.type || 'text';
      const isPassword = inputType === 'password';
      const label = target.placeholder || target.name || target.id || target.tagName.toLowerCase();
      const event: CaptureEvent = {
        timestamp: new Date().toISOString(),
        type: 'INPUT',
        target: target.id ? `#${target.id}` : label,
        metadata: {
          inputType,
          label,
          value: isPassword ? '[REDACTED]' : '[INPUT]',
        },
      };
      capturedEvents.current.push(event);
      addLiveEvent({
        timestamp: event.timestamp,
        type: 'INPUT',
        target: label,
        detail: isPassword ? 'password field' : `${inputType} field`,
        category: 'action',
      });
    };

    const handleSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      const event: CaptureEvent = {
        timestamp: new Date().toISOString(),
        type: 'SUBMIT',
        target: form.id ? `#${form.id}` : form.action || 'form',
        metadata: { action: form.action, method: form.method },
      };
      capturedEvents.current.push(event);
      addLiveEvent({
        timestamp: event.timestamp,
        type: 'SUBMIT',
        target: form.action || 'form',
        category: 'action',
      });
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('submit', handleSubmit, true);

    // Store cleanup handlers
    (window as unknown as Record<string, unknown>).__bugboxCleanup = () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, [addLiveEvent]);

  const takeScreenshot = useCallback(async () => {
    try {
      const capturedCanvas = await html2canvas(document.body, {
        backgroundColor: '#020617',
        useCORS: true,
        logging: false,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        onclone: (clonedDocument) => {
          clonedDocument.querySelectorAll('input[type="password"]').forEach((input) => {
            input.setAttribute('value', '[REDACTED]');
            (input as HTMLInputElement).value = '[REDACTED]';
          });
        },
      });
      setScreenshotDataUrl(capturedCanvas.toDataURL('image/png'));
      setHasScreenshot(true);
      addLiveEvent({
        timestamp: new Date().toISOString(),
        type: 'SCREENSHOT',
        target: window.location.pathname,
        detail: `${window.innerWidth}Ã—${window.innerHeight}`,
        category: 'action',
      });
      return;

      // Use html2canvas equivalent via canvas API to capture the iframe if possible
      // For MVP, we use a placeholder screenshot indicator
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = Math.min(window.innerHeight, 600);
      const ctx = canvas.getContext('2d')!;
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#22d3ee';
        ctx.font = '20px monospace';
        ctx.fillText(`Screenshot @ ${new Date().toLocaleTimeString()}`, 20, 40);
        ctx.fillStyle = '#64748b';
        ctx.font = '14px monospace';
        ctx.fillText(`URL: ${window.location.href}`, 20, 70);
        ctx.fillText(`Viewport: ${window.innerWidth}×${window.innerHeight}`, 20, 95);
        const dataUrl = canvas.toDataURL('image/png');
        setScreenshotDataUrl(dataUrl);
        setHasScreenshot(true);
        addLiveEvent({
          timestamp: new Date().toISOString(),
          type: 'SCREENSHOT',
          target: window.location.pathname,
          detail: `${window.innerWidth}×${window.innerHeight}`,
          category: 'action',
        });
      }
    } catch (err) {
      console.error('Screenshot failed:', err);
    }
  }, [addLiveEvent]);

  const stopCapture = useCallback(async () => {
    setIsCapturing(false);
    setIsProcessing(true);

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);

    // Restore intercepted functions
    if (originalFetch.current) window.fetch = originalFetch.current;
    if (originalConsoleError.current) console.error = originalConsoleError.current;
    if (originalConsoleWarn.current) console.warn = originalConsoleWarn.current;
    if (originalConsoleLog.current) console.log = originalConsoleLog.current;

    // Remove DOM listeners
    const cleanup = (window as unknown as Record<string, unknown>).__bugboxCleanup;
    if (typeof cleanup === 'function') cleanup();

    // Build session info
    const sessionInfo = {
      browser: getBrowserInfo(),
      os: getOSInfo(),
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Submit to API
    try {
      const res = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          description,
          severity,
          session: sessionInfo,
          events: capturedEvents.current,
          network_events: capturedNetwork.current,
          console_events: capturedConsole.current,
          screenshot_data_url: screenshotDataUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/bugs/${data.bug_box_id}`);
      } else {
        setIsProcessing(false);
        alert('Failed to save bug box. Please try again.');
      }
    } catch (err) {
      console.error('Failed to submit bug box:', err);
      setIsProcessing(false);
    }
  }, [description, severity, screenshotDataUrl, router]);

  // Auto-scroll events list
  useEffect(() => {
    if (eventsListRef.current) {
      eventsListRef.current.scrollTop = eventsListRef.current.scrollHeight;
    }
  }, [liveEvents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (originalFetch.current) window.fetch = originalFetch.current;
      if (originalConsoleError.current) console.error = originalConsoleError.current;
      if (originalConsoleWarn.current) console.warn = originalConsoleWarn.current;
    };
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const networkErrors = liveEvents.filter((e) => e.category === 'network' && (e.status || 0) >= 400).length;
  const consoleErrors = liveEvents.filter((e) => e.category === 'console' && e.severity === 'error').length;

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
              <span className="font-bold text-slate-100">BUG<span className="text-cyan-400">{'//'}</span>BOX</span>
            </div>
          </div>

          {isCapturing && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-rose-400">REC</span>
                <span className="text-slate-300">{formatDuration(sessionDuration)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {networkErrors > 0 && (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />{networkErrors} HTTP error
                  </span>
                )}
                {consoleErrors > 0 && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5" />{consoleErrors} error
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left — Controls */}
        <div className="space-y-6">
          {/* Session config */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              Capture Session
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Target URL</label>
                <input
                  type="text"
                  placeholder="https://your-app.com"
                  value={captureUrl}
                  onChange={(e) => setCaptureUrl(e.target.value)}
                  disabled={isCapturing}
                  className="mt-1.5 w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="What bug are you trying to capture?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isCapturing}
                  rows={2}
                  className="mt-1.5 w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  disabled={isCapturing}
                  className="mt-1.5 w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            {/* Action buttons */}
            {!isCapturing && !isProcessing && (
              <button
                onClick={startCapture}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Capture
              </button>
            )}

            {isCapturing && (
              <div className="space-y-2">
                <button
                  onClick={takeScreenshot}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-slate-100 text-sm font-medium transition-all"
                >
                  <Camera className="w-4 h-4" />
                  Take Screenshot
                  {hasScreenshot && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </button>
                <button
                  onClick={stopCapture}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white font-bold text-sm transition-all animate-record-pulse"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop &amp; Package Bug
                </button>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center justify-center gap-3 py-4 text-cyan-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Packaging Bug Box…</span>
              </div>
            )}
          </div>

          {/* Environment info */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5" />
              Environment (Auto-Captured)
            </h3>
            <div className="space-y-2 text-xs font-mono">
              {[
                ['Browser', getBrowserInfo()],
                ['OS', getOSInfo()],
                ['Viewport', `${typeof window !== 'undefined' ? window.innerWidth : '?'}×${typeof window !== 'undefined' ? window.innerHeight : '?'}`],
                ['Timezone', Intl.DateTimeFormat().resolvedOptions().timeZone],
              ].map(([key, val]) => (
                <div key={key} className="flex justify-between gap-2">
                  <span className="text-slate-500">{key}</span>
                  <span className="text-slate-300 text-right">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-xs text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-cyan-300 mb-1">Tip: Try the Demo App</p>
              <p>Use the <Link href="/demo" className="text-cyan-400 underline">Demo App</Link> to trigger a deterministic HTTP 500 bug that BUG{'//'}BOX will capture and package automatically.</p>
            </div>
          </div>
        </div>

        {/* Right — Live Event Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Live Event Feed
              {isCapturing && <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />Actions
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />Network
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />Console
              </span>
            </div>
          </div>

          <div
            ref={eventsListRef}
            className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 h-96 overflow-y-auto space-y-1 font-mono text-xs"
          >
            {liveEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2">
                {isCapturing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
                    <p>Waiting for events…</p>
                    <p className="text-slate-700">Interact with the page to capture events</p>
                  </>
                ) : (
                  <>
                    <Terminal className="w-6 h-6" />
                    <p>Events will appear here during capture</p>
                  </>
                )}
              </div>
            ) : (
              liveEvents.map((event) => {
                const timeStr = new Date(event.timestamp).toLocaleTimeString('en', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                const colorClass =
                  event.category === 'network'
                    ? event.severity === 'error'
                      ? 'text-rose-400'
                      : event.severity === 'warn'
                      ? 'text-amber-400'
                      : 'text-blue-400'
                    : event.category === 'console'
                    ? event.severity === 'error'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                    : 'text-slate-400';

                return (
                  <div key={event.id} className="flex items-start gap-3 hover:bg-slate-800/40 rounded px-2 py-1 transition-colors">
                    <span className="text-slate-600 flex-shrink-0 text-[10px] mt-0.5">{timeStr}</span>
                    <span className={`font-bold w-16 flex-shrink-0 text-[11px] mt-0.5 ${colorClass}`}>
                      {event.type}
                    </span>
                    <span className="text-slate-300 truncate">{event.target || ''}</span>
                    {event.detail && <span className="text-slate-500 truncate flex-shrink-0 max-w-[30%]">{event.detail}</span>}
                  </div>
                );
              })
            )}
          </div>

          {/* Event counters */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Clock, label: 'Actions', count: liveEvents.filter((e) => e.category === 'action').length, color: 'text-slate-400' },
              { icon: Wifi, label: 'Network Errors', count: networkErrors, color: networkErrors > 0 ? 'text-rose-400' : 'text-slate-500' },
              { icon: Terminal, label: 'Console Errors', count: consoleErrors, color: consoleErrors > 0 ? 'text-amber-400' : 'text-slate-500' },
            ].map((c, i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.count}</p>
                </div>
                <c.icon className={`w-5 h-5 ${c.color} opacity-60`} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
