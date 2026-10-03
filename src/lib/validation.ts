import type { SubmitBugBoxPayload, Severity } from '@/lib/types';

const MAX_EVENTS = 500;
const MAX_CONSOLE_EVENTS = 500;
const MAX_NETWORK_EVENTS = 500;
const MAX_STRING = 2000;

function text(value: unknown, field: string, max = MAX_STRING): string {
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  return value.slice(0, max);
}

function list(value: unknown, field: string, max: number): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  if (value.length > max) throw new Error(`${field} exceeds the ${max} item limit`);
  return value;
}

export function parseSubmitBugBoxPayload(input: unknown): SubmitBugBoxPayload {
  if (!input || typeof input !== 'object') throw new Error('Request body must be an object');
  const body = input as Record<string, unknown>;
  const session = body.session as Record<string, unknown>;
  if (!session || typeof session !== 'object') throw new Error('session is required');

  const severity = body.severity || 'MEDIUM';
  if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(severity))) {
    throw new Error('Invalid severity');
  }

  const events = list(body.events, 'events', MAX_EVENTS).map((event) => {
    if (!event || typeof event !== 'object') throw new Error('Invalid event');
    const item = event as Record<string, unknown>;
    return { timestamp: text(item.timestamp, 'event.timestamp', 80), type: text(item.type, 'event.type', 80), target: item.target == null ? null : text(item.target, 'event.target'), metadata: (item.metadata as Record<string, unknown> | null) || null };
  });
  const network_events = list(body.network_events, 'network_events', MAX_NETWORK_EVENTS).map((event) => {
    if (!event || typeof event !== 'object') throw new Error('Invalid network event');
    const item = event as Record<string, unknown>;
    const status = Number(item.status);
    if (!Number.isInteger(status) || status < 0 || status > 999) throw new Error('Invalid network status');
    return { timestamp: text(item.timestamp, 'network.timestamp', 80), method: text(item.method, 'network.method', 16), endpoint: text(item.endpoint, 'network.endpoint'), status, duration: Math.max(0, Number(item.duration) || 0), headers: item.headers as Record<string, string> | undefined, payload: item.payload };
  });
  const console_events = list(body.console_events, 'console_events', MAX_CONSOLE_EVENTS).map((event) => {
    if (!event || typeof event !== 'object') throw new Error('Invalid console event');
    const item = event as Record<string, unknown>;
    const level = String(item.level);
    if (!['log', 'info', 'warn', 'error'].includes(level)) throw new Error('Invalid console level');
    return { timestamp: text(item.timestamp, 'console.timestamp', 80), level: level as 'log' | 'info' | 'warn' | 'error', message: text(item.message, 'console.message'), source: item.source == null ? undefined : text(item.source, 'console.source') };
  });

  return {
    title: body.title ? text(body.title, 'title', 200) : '',
    description: body.description == null ? undefined : text(body.description, 'description', 5000),
    severity: severity as Severity,
    session: { browser: text(session.browser, 'session.browser', 120), os: text(session.os, 'session.os', 120), viewport: text(session.viewport, 'session.viewport', 80), timezone: text(session.timezone, 'session.timezone', 80) },
    events,
    network_events,
    console_events,
    screenshot_data_url: body.screenshot_data_url == null ? undefined : text(body.screenshot_data_url, 'screenshot_data_url', 5_000_000),
  };
}
