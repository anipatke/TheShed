import { useEffect, useRef, useState } from 'react';
import type { Env } from '../../shared/types.ts';
import type { ProjectDraft } from './api.ts';
import { looksLikeFolder, safeHref } from './model.ts';

interface Props {
  /** `add` is the full-width form under the toolbar; `edit` fits inside a card. */
  variant: 'add' | 'edit';
  initial?: ProjectDraft;
  submitLabel: string;
  /** Rejects with a message to show; the form stays open so it can be retried. */
  onSubmit: (draft: ProjectDraft) => Promise<void>;
  onClose: () => void;
}

/** Turn what was typed into a draft, or say what is wrong with it. */
function toDraft(v: { name: string; url: string; folder: string; env: string; port: string; command: string }): ProjectDraft | string {
  const name = v.name.trim();
  const url = v.url.trim();
  const folder = v.folder.trim();
  const port = v.port.trim();
  const command = v.command.trim();
  if (!name) return 'Give the project a name';
  if (url && !safeHref(url)) return 'URL must be a full http:// or https:// address';
  if (folder && !looksLikeFolder(folder)) return 'Folder must be an absolute path';
  if (port && !(/^\d+$/.test(port) && Number(port) >= 1 && Number(port) <= 65535)) return 'Port must be a whole number from 1 to 65535';
  if (command && /[\r\n]/.test(command)) return 'Launch command must be a single line';
  return {
    name,
    ...(url && { url }),
    ...(port && { port: Number(port) }),
    // An environment only means something with a folder; blank lets the server read it from the folder's form.
    ...(folder && { folder }),
    ...(folder && v.env && { env: v.env as Env }),
    ...(command && { launch: { command } }),
  };
}

export function ProjectForm({ variant, initial, submitLabel, onSubmit, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [folder, setFolder] = useState(initial?.folder ?? '');
  const [env, setEnv] = useState<string>(initial?.env ?? '');
  const [port, setPort] = useState(initial?.port?.toString() ?? '');
  const [command, setCommand] = useState(initial?.launch?.command ?? '');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.select(), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const draft = toDraft({ name, url, folder, env, port, command });
    if (typeof draft === 'string') return setError(draft);
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit(draft);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form className={variant} onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className={`${variant}__fields`}>
        <label>
          <span>Name</span>
          <input ref={first} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required placeholder="Docs site" />
        </label>
        <label>
          <span>Folder</span>
          <input className="mono" value={folder} onChange={(e) => setFolder(e.target.value)} maxLength={1000} spellCheck={false} placeholder="/home/me/code/app or C:\dev\app" />
        </label>
        <label>
          <span>Env</span>
          <select value={env} onChange={(e) => setEnv(e.target.value)} disabled={!folder.trim()}>
            <option value="">Detect from folder</option>
            <option value="windows">Windows</option>
            <option value="wsl">WSL</option>
            <option value="linux">Linux</option>
          </select>
        </label>
        <label>
          <span>Port</span>
          <input className="mono" value={port} onChange={(e) => setPort(e.target.value)} inputMode="numeric" maxLength={5} placeholder="preferred, optional" />
        </label>
        <label>
          <span>URL</span>
          <input className="mono" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={2000} inputMode="url" spellCheck={false} placeholder="http://localhost:3000, optional" />
        </label>
        <label>
          <span>Launch</span>
          <input className="mono" value={command} onChange={(e) => setCommand(e.target.value)} maxLength={1000} spellCheck={false} placeholder="npm run dev -- --port {port} --strictPort, optional" />
          <small>Launching needs a folder and a preferred port. {'{port}'} is replaced by the preferred port.</small>
        </label>
      </div>
      <div className={`${variant}__actions`}>
        {error && (
          <p className={`${variant}__error`} role="alert">
            {error}
          </p>
        )}
        <button type="button" className={`btn btn--ghost${variant === 'edit' ? ' btn--small' : ''}`} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className={`btn btn--primary${variant === 'edit' ? ' btn--small' : ''}`} disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
