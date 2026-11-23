// BLACK BOX: makes sure the app's own log reaches Sentry when something goes wrong, without the user doing anything.
//
//  1. Right away, when the app shows warning signs (iOS low-memory warning, a freeze of 2 s or more, a fatal JS
//     error): a snapshot of the last 300 log lines is sent immediately, so we have it even if the app then dies
//     and the user never opens it again. At most one snapshot per reason every 5 minutes.
//  2. On the next launch after a crash (Sentry.crashedLastRun) or after the app was killed while it was in the
//     foreground (no "app → background" before the log stopped): the whole previous session's log is sent.
//
// Native crashes cannot send anything at the moment of the crash (the OS is killing the process), which is why
// point 2 exists. Logs are scrubbed of IP addresses and stream URL tokens before they leave the phone.
import * as Sentry from '@sentry/react-native';
import { getLog, logToText, type LogLine } from './applog';

const SNAPSHOT_LINES = 300;
const SESSION_LINES = 800;
const THROTTLE_MS = 5 * 60 * 1000;
const lastSent = new Map<string, number>();

export function scrubLog(text: string): string {
  return text
    .replace(/(https?:\/\/[^\s?]*googlevideo\.com[^\s?]*)\?\S*/g, '$1?…') // stream URLs carry ip=, signatures, tokens
    .replace(/([?&](?:ip|ipbits|sig|signature|lsig|key|token|pot)=)[^&\s]*/gi, '$1•')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '•.•.•.•') // IPv4
    .replace(/\b(?:[0-9a-f]{1,4}:){4,7}[0-9a-f]{1,4}\b/gi, '•:•:•'); // IPv6
}

function send(reason: string, title: string, lines: LogLine[], level: Sentry.SeverityLevel) {
  try {
    if (!lines.length) return;
    const text = scrubLog(logToText(lines));
    Sentry.withScope((scope) => {
      scope.setTag('blackbox', reason);
      scope.setExtra('log_lines', lines.length);
      scope.addAttachment({ filename: `zyx-log-${reason}.txt`, data: text, contentType: 'text/plain' });
      Sentry.captureMessage(`ZYX log · ${title}`, level);
    });
  } catch {}
}

// Point 1: called by the app log when a warning sign is logged
export function blackBoxSnapshot(reason: 'memory' | 'freeze' | 'fatal' | 'test', detail: string) {
  if (__DEV__) return;
  const now = Date.now();
  if (reason !== 'test' && now - (lastSent.get(reason) ?? 0) < THROTTLE_MS) return;
  lastSent.set(reason, now);
  send(reason, `${reason}: ${detail.slice(0, 80)}`, getLog().slice(-SNAPSHOT_LINES), reason === 'fatal' ? 'error' : 'warning');
}

// Point 2: previousSession = the persisted log lines of the run before this one (captured by installAppLog)
export async function reportPreviousRun(previousSession: LogLine[]) {
  if (__DEV__ || !previousSession.length) return;
  let crashed: boolean | null = null;
  try {
    crashed = await Sentry.crashedLastRun();
  } catch {}
  const last = previousSession[previousSession.length - 1];
  // killed in the foreground: the last thing the previous run logged was not going to the background
  const killed = !/app → (background|inactive|reload)/.test(last.msg) && !last.bg;
  if (!crashed && !killed) return;
  try {
    const L = require('./applog') as typeof import('./applog');
    L.markCrash(last.t); // shows a crash badge on that day in Settings › Log
    L.log('error', `previous run ${crashed ? 'crashed' : 'was closed by the system'} after ${L.fmtTime(last.t)}`);
  } catch {}
  send(
    crashed ? 'crash' : 'killed',
    crashed ? 'log before the crash (previous run)' : 'log before the app was closed by the system (previous run)',
    previousSession.slice(-SESSION_LINES),
    crashed ? 'error' : 'warning'
  );
}
