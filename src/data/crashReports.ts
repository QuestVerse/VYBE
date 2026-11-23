// Settings › "Send crash reports" (on by default). Off: nothing goes to Sentry — no crash reports, no black-box logs.
// JS errors stop at once; native crash reports are switched off by closing Sentry now and not starting it next launch.
import { useSyncExternalStore } from 'react';
import { kvGet, kvSet } from './db';

const KEY = 'zyx.crashReports';
const subs = new Set<() => void>();
let cached: boolean | null = null;

export function crashReportsOn(): boolean {
  if (cached === null) {
    try {
      cached = kvGet<boolean>(KEY) !== false;
    } catch {
      return true; // database not ready yet: keep the default
    }
  }
  return cached;
}

export function setCrashReports(on: boolean) {
  cached = on;
  kvSet(KEY, on);
  if (!on) {
    try {
      void (require('@sentry/react-native') as typeof import('@sentry/react-native')).close();
    } catch {}
  }
  subs.forEach((f) => f());
}

export function useCrashReports(): boolean {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    crashReportsOn
  );
}
