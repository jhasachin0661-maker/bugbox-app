// BUG//BOX Type Definitions

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BugStatus = 'Captured' | 'Reproducible' | 'Investigating' | 'Resolved' | 'Closed';
export type ReplayStatus = 'READY' | 'RUNNING' | 'SUCCESS' | 'FAILED';
export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';

export interface BugBox {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  severity: Severity;
  status: BugStatus;
  share_token: string;
  created_at: string;
  updated_at: string;
  // joined
  sessions?: Session[];
}

export interface Session {
  id: string;
  bug_box_id: string;
  started_at: string;
  ended_at: string | null;
  browser: string | null;
  os: string | null;
  viewport: string | null;
  timezone: string | null;
  // joined
  events?: BugEvent[];
  network_events?: NetworkEvent[];
  console_events?: ConsoleEvent[];
  screenshots?: Screenshot[];
}

export interface BugEvent {
  id: string;
  session_id: string;
  timestamp: string;
  type: string;
  target: string | null;
  metadata: Record<string, unknown> | null;
}

export interface NetworkEvent {
  id: string;
  session_id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status: number;
  duration: number | null;
  request_size: number | null;
  response_size: number | null;
  payload_redacted: Record<string, unknown> | null;
}

export interface ConsoleEvent {
  id: string;
  session_id: string;
  timestamp: string;
  level: ConsoleLevel;
  message: string;
  source: string | null;
}

export interface Screenshot {
  id: string;
  session_id: string;
  timestamp: string;
  storage_url: string;
  viewport: string | null;
}

export interface Replay {
  id: string;
  bug_box_id: string;
  started_at: string;
  completed_at: string | null;
  status: ReplayStatus;
  result: ReplayResult | null;
}

export interface ReplayResult {
  steps: ReplayStep[];
  error?: string;
}

export interface ReplayStep {
  action: string;
  status: 'success' | 'failed' | 'pending';
  detail?: string;
  timestamp?: string;
}

// Capture payload types (sent from browser capture layer)
export interface CaptureSession {
  browser: string;
  os: string;
  viewport: string;
  timezone: string;
}

export interface CaptureEvent {
  timestamp: string;
  type: string;
  target: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CaptureNetworkEvent {
  timestamp: string;
  method: string;
  endpoint: string;
  status: number;
  duration: number;
  request_size?: number;
  response_size?: number;
  headers?: Record<string, string>;
  payload?: unknown;
}

export interface CaptureConsoleEvent {
  timestamp: string;
  level: ConsoleLevel;
  message: string;
  source?: string;
}

export interface SubmitBugBoxPayload {
  title: string;
  description?: string;
  severity: Severity;
  session: CaptureSession;
  events: CaptureEvent[];
  network_events: CaptureNetworkEvent[];
  console_events: CaptureConsoleEvent[];
  screenshot_data_url?: string;
}
