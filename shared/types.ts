// Types shared by the server and the client. Keep this file free of runtime code.

/** Where a listening socket lives. `linux` is a non-WSL Linux host. */
export type Env = 'windows' | 'wsl' | 'linux';

/**
 * What an HTTP probe found:
 * - web: answered HTTP with an HTML page (or a redirect) — something to open in a browser
 * - http: answered HTTP, but not with a page (JSON API, 401, plain text…)
 * - tcp: accepts connections but does not speak HTTP
 * - closed: nothing accepted the connection
 * - unverified: could not be probed from where the server runs (e.g. WSL NAT mode)
 */
export type ProbeKind = 'web' | 'http' | 'tcp' | 'closed' | 'unverified';

export interface Probe {
  kind: ProbeKind;
  status?: number;
  contentType?: string;
  /** Untrusted text taken from the service's <title>. Render as text only. */
  title?: string;
  ms?: number;
  error?: string;
}

export interface Service {
  /** `${env}:${port}` — stable for the lifetime of a listener. */
  id: string;
  env: Env;
  port: number;
  addresses: string[];
  /** Built by the server from the port, never taken from the service. */
  url: string;
  pid?: number;
  processName?: string;
  commandLine?: string;
  /** Exact working directory (WSL/Linux only). */
  cwd?: string;
  /** Best-guess project root. */
  projectDir?: string;
  projectDirSource?: 'cwd' | 'commandLine';
  /** From package.json, when one could be read. */
  packageName?: string;
  /** Display name, picked from the best available signal. */
  name: string;
  nameSource: 'package' | 'directory' | 'title' | 'process' | 'port';
  probe: Probe;
  /** Identity key for favourites and overrides: project folder + process when known, else env + port. */
  favouriteKey: string;
  /** The Shed's own server. */
  self?: boolean;
}

export interface SourceReport {
  env: Env;
  ok: boolean;
  method: string;
  count: number;
  ms: number;
  error?: string;
  notes: string[];
}

export interface ManualProject {
  id: string;
  name: string;
  url: string;
  /** Optional project folder the user associated with it. */
  folder?: string;
}

/** User-supplied name and/or folder for a discovered service, keyed by its identity key. */
export interface Override {
  key: string;
  name?: string;
  folder?: string;
}

export interface ManualStatus {
  id: string;
  probe: Probe;
}

export interface Favourite {
  key: string;
  name: string;
  url: string;
  env?: Env;
  lastSeen?: string;
}

export type HideRule =
  | { id: string; kind: 'port'; env: Env; port: number }
  | { id: string; kind: 'process'; env: Env; process: string };

export interface Config {
  version: 1;
  manual: ManualProject[];
  favourites: Favourite[];
  hidden: HideRule[];
  overrides: Override[];
}

export interface ScanResult {
  scannedAt: string;
  durationMs: number;
  host: { env: Env; networkingMode?: string };
  sources: SourceReport[];
  services: Service[];
  manual: ManualStatus[];
}

export interface State {
  scan: ScanResult;
  config: Config;
}
