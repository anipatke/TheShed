import type { Env } from '../../shared/types.ts';
import { run } from './run.ts';
import { cleanText, mergeListeners, type Listener, type SourceOutput } from './listener.ts';

// A constant script: nothing is ever interpolated into it. It prints the distro name,
// the `ss` listener table, then one `pid<TAB>cwd<TAB>cmdline` row per owning process.
// /proc details are only readable for the current user's processes; others come back blank.
export const POSIX_SCRIPT = `
command -v ss >/dev/null 2>&1 || { echo "ss (iproute2) not found" >&2; exit 3; }
echo "@@DISTRO	\${WSL_DISTRO_NAME:-}"
out=$(ss -Hltnp 2>/dev/null)
printf '%s\\n' "$out"
echo "@@PROC"
for p in $(printf '%s\\n' "$out" | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u); do
  printf '%s\\t%s\\t' "$p" "$(readlink /proc/$p/cwd 2>/dev/null)"
  tr '\\0\\n\\t' '   ' < /proc/$p/cmdline 2>/dev/null
  echo
done
`;

/** Parse `ss -Hltnp` local address column: `127.0.0.1:5173`, `[::]:80`, `127.0.0.53%lo:53`, `*:22`. */
export function parseSsAddress(field: string): { address: string; port: number } | undefined {
  const idx = field.lastIndexOf(':');
  if (idx <= 0) return undefined;
  const port = Number(field.slice(idx + 1));
  if (!Number.isInteger(port) || port < 1 || port > 65535) return undefined;
  let address = field.slice(0, idx).replace(/^\[|\]$/g, '').replace(/%.*$/, '');
  if (address === '*') address = '0.0.0.0';
  return { address, port };
}

export function parsePosixOutput(stdout: string, env: Env): Omit<SourceOutput, 'method' | 'notes'> {
  const [head, procPart = ''] = stdout.split(/^@@PROC$/m);
  let distro: string | undefined;
  const rows: Listener[] = [];

  for (const line of head.split('\n')) {
    if (line.startsWith('@@DISTRO\t')) {
      distro = cleanText(line.slice(9), 100);
      continue;
    }
    const fields = line.trim().split(/\s+/);
    if (fields.length < 4 || fields[0] !== 'LISTEN') continue;
    const local = parseSsAddress(fields[3]);
    if (!local) continue;
    const users = /\("((?:[^"\\]|\\.)*)",pid=(\d+)/.exec(line);
    rows.push({
      env,
      port: local.port,
      addresses: [local.address],
      pid: users ? Number(users[2]) : undefined,
      processName: users ? cleanText(users[1], 200) : undefined,
    });
  }

  const procs = new Map<number, { cwd?: string; commandLine?: string }>();
  for (const line of procPart.split('\n')) {
    const [pid, cwd, ...rest] = line.split('\t');
    if (!/^\d+$/.test(pid ?? '')) continue;
    procs.set(Number(pid), { cwd: cleanText(cwd, 1000), commandLine: cleanText(rest.join(' ')) });
  }
  for (const row of rows) {
    const proc = row.pid === undefined ? undefined : procs.get(row.pid);
    if (proc) Object.assign(row, proc);
  }

  // 127.0.0.53 / 127.0.0.54 / 10.255.255.254 :53 are systemd-resolved and WSL's DNS proxy.
  const filtered = rows.filter((r) => !(r.port === 53 && !r.pid));
  return { listeners: mergeListeners(filtered), distro };
}

/** Discover listeners on this Linux/WSL host. */
export async function discoverPosixLocal(env: Env): Promise<SourceOutput> {
  const { stdout } = await run('sh', ['-c', POSIX_SCRIPT]);
  const parsed = parsePosixOutput(stdout, env);
  const notes: string[] = [];
  const unowned = parsed.listeners.filter((l) => l.pid === undefined).length;
  if (unowned) notes.push(`${unowned} port(s) belong to other users (e.g. system services); process details hidden without sudo.`);
  return { ...parsed, method: 'ss + /proc', notes };
}

/** Discover WSL listeners from a Windows host via the default distro. */
export async function discoverWslFromWindows(): Promise<SourceOutput> {
  const { stdout } = await run('wsl.exe', ['-e', 'sh', '-c', POSIX_SCRIPT], { timeoutMs: 15_000 });
  const parsed = parsePosixOutput(stdout, 'wsl');
  const notes = ['Default WSL distro only.'];
  const unowned = parsed.listeners.filter((l) => l.pid === undefined).length;
  if (unowned) notes.push(`${unowned} port(s) belong to other users; process details hidden without sudo.`);
  return { ...parsed, method: 'wsl.exe → ss + /proc', notes };
}
