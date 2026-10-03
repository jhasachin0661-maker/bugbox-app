/**
 * Automatic redaction module for BUG//BOX.
 * Sensitive data is NEVER stored in raw form.
 */

const SENSITIVE_KEYS = [
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'auth',
  'bearer',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'id_token',
  'session',
  'cookie',
  'x-auth-token',
  'x-api-key',
  'private_key',
  'client_secret',
  'credit_card',
  'card_number',
  'cvv',
  'ssn',
];

// Patterns to detect in values
const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*/gi, // Bearer JWT
  /eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*/g, // raw JWT
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // credit card
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
];

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase().replace(/[-_\s]/g, '');
  return SENSITIVE_KEYS.some((sensitive) =>
    lowerKey.includes(sensitive.replace(/[-_\s]/g, ''))
  );
}

function redactValue(value: string): string {
  let redacted = value;
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
}

/**
 * Recursively redact sensitive fields from an object.
 */
export function redactObject(
  obj: unknown,
  depth = 0
): unknown {
  if (depth > 10) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return redactValue(obj);
  }

  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      result[key] = redactValue(value);
    } else {
      result[key] = redactObject(value, depth + 1);
    }
  }
  return result;
}

/**
 * Redact sensitive headers from a headers record.
 */
export function redactHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (isSensitiveKey(key)) {
      result[key] = '[REDACTED]';
    } else {
      // Still check values for bearer tokens etc.
      result[key] = redactValue(value);
    }
  }
  return result;
}

/**
 * Generate human-readable reproduction steps from events.
 */
export function generateReproductionSteps(
  events: Array<{ type: string; target: string | null; metadata: Record<string, unknown> | null }>
): string[] {
  const steps: string[] = [];

  for (const event of events) {
    switch (event.type) {
      case 'PAGE_LOAD':
      case 'NAVIGATE': {
        const url = (event.metadata?.url as string) || event.target || '/';
        steps.push(`Open ${url}`);
        break;
      }
      case 'CLICK': {
        const label =
          (event.metadata?.text as string) ||
          (event.metadata?.label as string) ||
          event.target ||
          'element';
        steps.push(`Click "${label}"`);
        break;
      }
      case 'INPUT': {
        const field =
          (event.metadata?.label as string) ||
          (event.metadata?.placeholder as string) ||
          event.target ||
          'input field';
        steps.push(`Type in "${field}"`);
        break;
      }
      case 'SUBMIT': {
        const form = event.target || 'form';
        steps.push(`Submit ${form}`);
        break;
      }
      case 'SCROLL': {
        steps.push(`Scroll on page`);
        break;
      }
      case 'KEYPRESS': {
        const key = event.metadata?.key as string;
        if (key) steps.push(`Press ${key} key`);
        break;
      }
      default:
        if (event.target) {
          steps.push(`${event.type} on ${event.target}`);
        }
    }
  }

  // Deduplicate consecutive identical scroll steps
  return steps.reduce<string[]>((acc, step) => {
    if (step === 'Scroll on page' && acc[acc.length - 1] === 'Scroll on page') {
      return acc;
    }
    acc.push(step);
    return acc;
  }, []);
}

/**
 * Generate a short bug title from captured data.
 */
export function generateBugTitle(
  networkEvents: Array<{ status: number; endpoint: string; method: string }>,
  consoleEvents: Array<{ level: string; message: string }>
): string {
  // Find the first error network event
  const errorNet = networkEvents.find((e) => e.status >= 400);
  if (errorNet) {
    return `${errorNet.method} ${errorNet.endpoint} returns HTTP ${errorNet.status}`;
  }

  // Find the first console error
  const errorConsole = consoleEvents.find((e) => e.level === 'error');
  if (errorConsole) {
    const msg = errorConsole.message.slice(0, 80);
    return `Console error: ${msg}`;
  }

  return 'Uncategorized Bug';
}
