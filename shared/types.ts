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

/** A project the user registered. `env` is present exactly when `folder` is, and the folder is in that environment's own path form. */
export interface Project {
  id: string;
  name: string;
  env?: Env;
  folder?: string;
  /** Preferred port. A preference only: nothing changes a port automatically. */
  port?: number;
  url?: string;
  /** Trusted local configuration; `{port}` stands for the preferred port. Stored only — never derived from discovered data. */
  launch?: { command: string };
}

/** User-supplied name and/or folder for a discovered service, keyed by its identity key. */
export interface Override {
  key: string;
  name?: string;
  folder?: string;
}

export type RunState = 'starting' | 'running' | 'stopping' | 'stopped' | 'exited' | 'failed';

/** What The Shed knows about the latest launch it made for a project. In memory only; never survives a restart. */
export interface RunSummary {
  projectId: string;
  pid?: number;
  /** ISO time. */
  startedAt: string;
  port: number;
  state: RunState;
  exitCode?: number;
  signal?: string;
  message: string;
}

export type RefusalCode = 'unknown-project' | 'not-launchable' | 'wrong-environment' | 'already-active' | 'port-busy' | 'not-running';

/** Why a start or stop was refused. Nothing was spawned or signalled. */
export interface Refusal {
  ok: false;
  code: RefusalCode;
  message: string;
}

export interface ProjectStatus {
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
  version: 2;
  projects: Project[];
  favourites: Favourite[];
  hidden: HideRule[];
  overrides: Override[];
}

/** A registered project paired with the running service that is it. */
export interface ProjectMatch {
  projectId: string;
  serviceId: string;
}

/** A preferred port that is shared by several projects, or held by a listener that is not the project's own. */
export interface PortConflict {
  port: number;
  projectIds: string[];
  holder?: { serviceId: string; env: Env; processName?: string };
}

export interface ScanResult {
  scannedAt: string;
  durationMs: number;
  /** `distro` is the WSL distro name, used for editor links. */
  host: { env: Env; networkingMode?: string; distro?: string };
  sources: SourceReport[];
  services: Service[];
  projects: ProjectStatus[];
  matches: ProjectMatch[];
  conflicts: PortConflict[];
}

export interface State {
  scan: ScanResult;
  config: Config;
  /** The latest launch The Shed made per project, this server session only. */
  runs: RunSummary[];
}
