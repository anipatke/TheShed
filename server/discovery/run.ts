import { execFile } from 'node:child_process';

export interface RunOptions {
  timeoutMs?: number;
  input?: string;
  cwd?: string;
}

/**
 * Run a fixed executable with fixed arguments (no shell). Only discovery code calls this,
 * and only with constant scripts — no request data or service data ever reaches it.
 */
export function run(file: string, args: string[], opts: RunOptions = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      file,
      args,
      {
        timeout: opts.timeoutMs ?? 10_000,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
        cwd: opts.cwd,
        encoding: 'utf8',
      },
      (err, stdout, stderr) => {
        if (err) {
          const detail = stderr.trim().split('\n')[0];
          const code = (err as NodeJS.ErrnoException).code;
          const message =
            code === 'ENOENT' ? `${file} not found` : err.killed ? `${file} timed out` : detail || err.message;
          reject(new Error(message));
          return;
        }
        resolve({ stdout, stderr });
      },
    );
    // Always close stdin so tools that peek at it (PowerShell) never wait for input. A child that
    // exits first makes this EPIPE; that must not become an unhandled error that kills the server.
    child.stdin?.on('error', () => {});
    if (opts.input) child.stdin?.end(opts.input);
    else child.stdin?.end();
  });
}
