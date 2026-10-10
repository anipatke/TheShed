import { useEffect, useState } from 'react';
import { api } from './api.ts';

const POLL_MS = 1500;

/** Recent output of a project's latest run, as plain text, refreshed while it is open. */
export function LogPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [text, setText] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const t = await api.projectLog(projectId);
        if (live) {
          setText(t);
          setError(undefined);
        }
      } catch (err) {
        if (live) setError((err as Error).message);
      }
    };
    void load();
    const timer = setInterval(() => document.visibilityState === 'visible' && void load(), POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [projectId]);

  return (
    <div className="log">
      <div className="log__head">
        <span>Recent output</span>
        <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
          Close
        </button>
      </div>
      {error && (
        <p className="edit__error" role="alert">
          {error}
        </p>
      )}
      {/* Text node only: process output is never interpreted as HTML (SEC-03). */}
      <pre className="log__text" tabIndex={0} aria-label="Recent output">
        {text === undefined ? 'Loading…' : text || 'No output yet.'}
      </pre>
    </div>
  );
}
