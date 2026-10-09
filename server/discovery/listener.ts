import type { Env } from '../../shared/types.ts';

/** One listening port as reported by an OS, before identification and probing. */
export interface Listener {
  env: Env;
  port: number;
  addresses: string[];
  pid?: number;
  processName?: string;
  commandLine?: string;
  cwd?: string;
  executablePath?: string;
}

export interface SourceOutput {
  listeners: Listener[];
  method: string;
  notes: string[];
  /** WSL distro name, when known — used to read WSL files from Windows. */
  distro?: string;
}

/** Merge rows for the same env+port (e.g. one socket on 0.0.0.0 and another on ::). */
export function mergeListeners(rows: Listener[]): Listener[] {
  const byKey = new Map<string, Listener>();
  for (const row of rows) {
    const key = `${row.env}:${row.port}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...row, addresses: [...new Set(row.addresses)] });
      continue;
    }
    existing.addresses = [...new Set([...existing.addresses, ...row.addresses])];
    existing.pid ??= row.pid;
    existing.processName ??= row.processName;
    existing.commandLine ??= row.commandLine;
    existing.cwd ??= row.cwd;
    existing.executablePath ??= row.executablePath;
  }
  return [...byKey.values()].sort((a, b) => a.port - b.port);
}

export function cleanText(value: unknown, max = 2000): string | undefined {
  if (typeof value !== 'string') return undefined;
  // eslint-disable-next-line no-control-regex
  const text = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return text ? text.slice(0, max) : undefined;
}
