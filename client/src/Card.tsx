import { useEffect, useRef, useState } from 'react';
import type { Service } from '../../shared/types.ts';
import type { ProjectDraft } from './api.ts';
import { ENV_LABEL, KIND_LABEL, looksLikeFolder, safeHref, serviceOf, STATUS_LABEL, type Item } from './model.ts';
import { LogPanel } from './LogPanel.tsx';
import { ProjectForm } from './ProjectForm.tsx';
import { exitText, isActiveRun, isProblemRun, RUN_LABEL } from './runs.ts';

export interface CardActions {
  toggleFavourite: (item: Item) => void;
  hidePort: (service: Service) => void;
  hideProcess: (service: Service) => void;
  unhide: (item: Item) => void;
  removeProject: (id: string) => void;
  /** Save a name/folder for a discovered or remembered card. Empty strings clear. Rejects with a message. */
  save: (item: Item, edit: { name: string; folder: string }) => Promise<void>;
  /** Save a registered project. Rejects with a message. */
  saveProject: (id: string, draft: ProjectDraft) => Promise<void>;
  /** Register a project; `fromKey` is the discovered card it came from. Rejects with a message. */
  registerProject: (draft: ProjectDraft, fromKey?: string) => Promise<void>;
  /** Start, stop or restart a project's launch. Rejects with the server's reason when refused. */
  runAction: (id: string, action: 'start' | 'stop' | 'restart') => Promise<void>;
}

type FormMode = 'edit' | 'register';

function shortPath(p: string): string {
  return p.replace(/^\/home\/[^/]+/, '~').replace(/^[A-Z]:\\Users\\[^\\]+/i, '~');
}

function StatusLamp({ item }: { item: Item }) {
  return (
    <span className={`status status--${item.status}`} title={item.statusDetail}>
      <span className="status__lamp" aria-hidden="true" />
      <span className="status__label">{STATUS_LABEL[item.status]}</span>
    </span>
  );
}

function KindTag({ item }: { item: Item }) {
  if (item.kind === 'unknown') return null;
  return <span className={`tag tag--kind tag--${item.kind}`}>{KIND_LABEL[item.kind]}</span>;
}

function OwnerTag({ item }: { item: Item }) {
  if (!item.ownership) return null;
  const managed = item.ownership === 'managed';
  return (
    <span className={`tag tag--${item.ownership}`} title={managed ? 'The Shed started this' : 'Not started by The Shed; it cannot be stopped from here'}>
      {managed ? 'MANAGED' : 'EXTERNAL'}
    </span>
  );
}

/** Start/Stop/Restart for a registered project, its run state, a refusal, the error panel and the output view. */
function RunControls({ item, actions }: { item: Extract<Item, { type: 'project' }>; actions: CardActions }) {
  const { run, project } = item;
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string>();
  const [logOpen, setLogOpen] = useState(false);
  const active = isActiveRun(run);

  const go = async (action: 'start' | 'stop' | 'restart') => {
    setBusy(true);
    setRefusal(undefined);
    try {
      await actions.runAction(project.id, action);
    } catch (err) {
      setRefusal((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const exit = run && isProblemRun(run) ? exitText(run) : undefined;
  return (
    <div className="run">
      {run && (
        <p className={`run__state run__state--${run.state}`} role="status">
          <span className="run__dot" aria-hidden="true" />
          {RUN_LABEL[run.state]}
          {run.state === 'running' && <span className="dim"> · port {run.port}</span>}
        </p>
      )}
      {item.startBlock && !active && <p className="run__why">Cannot start: {item.startBlock}</p>}
      {run && isProblemRun(run) && (
        <div className="run__error" role="alert">
          <strong>{run.state === 'failed' ? 'Launch failed' : 'Exited unexpectedly'}</strong>
          {exit && <span> ({exit})</span>}
          <pre>{run.message}</pre>
        </div>
      )}
      {refusal && (
        <p className="edit__error" role="alert">
          {refusal}
        </p>
      )}
      <div className="run__buttons">
        {!active && !item.startBlock && (
          <button type="button" className="btn btn--primary btn--small" disabled={busy} onClick={() => void go('start')}>
            {busy ? 'Starting…' : 'Start'}
          </button>
        )}
        {active && (
          <>
            <button type="button" className="btn btn--ghost btn--small" disabled={busy || run.state === 'stopping'} onClick={() => void go('stop')}>
              {run.state === 'stopping' ? 'Stopping…' : 'Stop'}
            </button>
            <button type="button" className="btn btn--ghost btn--small" disabled={busy || run.state === 'stopping'} onClick={() => void go('restart')}>
              Restart
            </button>
          </>
        )}
        {run && (
          <button type="button" className="btn btn--ghost btn--small" aria-expanded={logOpen} onClick={() => setLogOpen((o) => !o)}>
            Output
          </button>
        )}
      </div>
      {logOpen && run && <LogPanel projectId={project.id} onClose={() => setLogOpen(false)} />}
    </div>
  );
}

function Star({ on, onClick, name }: { on: boolean; onClick: () => void; name: string }) {
  return (
    <button
      type="button"
      className={`icon-btn star${on ? ' star--on' : ''}`}
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
      title={on ? 'Unfavourite' : 'Favourite'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
      </svg>
    </button>
  );
}

function Menu({ label, children }: { label: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="icon-btn" aria-haspopup="menu" aria-expanded={open} aria-label={label} title={label} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>
      {open && (
        <div className="menu__panel" role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function OpenLink({ item, compact }: { item: Item; compact?: boolean }) {
  const href = safeHref(item.url);
  if (!href) return null;
  return (
    <a className={`btn btn--open${compact ? ' btn--small' : ''}`} href={href} target="_blank" rel="noopener noreferrer">
      Open
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </svg>
    </a>
  );
}

function ItemMenu({ item, actions, onForm }: { item: Item; actions: CardActions; onForm?: (mode: FormMode) => void }) {
  const onEdit = onForm && (() => onForm('edit'));
  if (item.type === 'offline' && !onEdit) return null;
  return (
    <Menu label={`More actions for ${item.name}`}>
      {(close) => {
        const act = (fn: () => void) => () => {
          close();
          fn();
        };
        const edit = onEdit && (
          <button type="button" role="menuitem" onClick={act(onEdit)}>
            {item.type === 'project' ? 'Edit…' : 'Rename / set folder…'}
          </button>
        );
        if (item.type === 'offline') return edit;
        if (item.type === 'project') {
          return (
            <>
              {edit}
              <button type="button" role="menuitem" onClick={act(() => actions.removeProject(item.project.id))}>
                Remove project
              </button>
            </>
          );
        }
        const s = item.service;
        const register = onForm && (
          <button type="button" role="menuitem" onClick={act(() => onForm('register'))}>
            Register as project…
          </button>
        );
        if (item.hiddenBy) {
          return (
            <>
              {edit}
              {register}
              <button type="button" role="menuitem" onClick={act(() => actions.unhide(item))}>
                Unhide
              </button>
            </>
          );
        }
        return (
          <>
            {edit}
            {register}
            <button type="button" role="menuitem" onClick={act(() => actions.hidePort(s))}>
              Hide port {s.port}
            </button>
            {s.processName && (
              <button type="button" role="menuitem" onClick={act(() => actions.hideProcess(s))}>
                Hide everything from <code>{s.processName}</code>
              </button>
            )}
          </>
        );
      }}
    </Menu>
  );
}

/** Rename / set folder for a discovered or remembered card. Projects use ProjectForm. */
function EditForm({ item, actions, onDone }: { item: Item; actions: CardActions; onDone: () => void }) {
  const userFolder = item.folderSource === 'user' ? item.folder ?? '' : '';
  const [name, setName] = useState(item.type === 'service' ? item.override?.name ?? '' : item.name);
  const [folder, setFolder] = useState(userFolder);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.select(), []);

  const placeholderName = item.type === 'service' ? item.discoveredName ?? item.service.name : '';
  const placeholderFolder = item.folderSource && item.folderSource !== 'user' ? item.folder : '/home/me/code/app or C:\\dev\\app';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (folder.trim() && !looksLikeFolder(folder.trim())) return setError('Folder must be an absolute path');
    setBusy(true);
    setError(undefined);
    try {
      await actions.save(item, { name: name.trim(), folder: folder.trim() });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form className="edit" onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && onDone()}>
      <label>
        <span>Name</span>
        <input ref={first} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={placeholderName} />
      </label>
      <label>
        <span>Folder</span>
        <input className="mono" value={folder} onChange={(e) => setFolder(e.target.value)} maxLength={1000} spellCheck={false} placeholder={placeholderFolder} />
      </label>
      <p className="edit__hint">Leave blank to use what was discovered.</p>
      {error && (
        <p className="edit__error" role="alert">
          {error}
        </p>
      )}
      <div className="edit__actions">
        <button type="button" className="btn btn--ghost btn--small" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary btn--small" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

/** The form a card shows in place of its details: edit a project, or register a discovered service as one. */
function CardForm({ item, mode, actions, onDone }: { item: Item; mode: FormMode; actions: CardActions; onDone: () => void }) {
  if (item.type === 'project') {
    return (
      <ProjectForm variant="edit" initial={item.project} submitLabel="Save" onClose={onDone} onSubmit={(d) => actions.saveProject(item.project.id, d)} />
    );
  }
  if (mode === 'register' && item.type === 'service') {
    const s = item.service;
    const initial: ProjectDraft = { name: item.name, ...(item.folder && { env: s.env, folder: item.folder }), port: s.port, url: s.url };
    return (
      <ProjectForm variant="edit" initial={initial} submitLabel="Register" onClose={onDone} onSubmit={(d) => actions.registerProject(d, s.favouriteKey)} />
    );
  }
  return <EditForm item={item} actions={actions} onDone={onDone} />;
}

const FOLDER_LABEL = { cwd: 'Dir', commandLine: 'Dir?', user: 'Dir' } as const;
const FOLDER_HINT = { cwd: 'working directory', commandLine: 'inferred from command line', user: 'set by you' } as const;

export function Card({ item, actions }: { item: Item; actions: CardActions }) {
  const [form, setForm] = useState<FormMode>();
  const s = serviceOf(item);
  const title = s?.probe.title && s.probe.title !== item.name ? s.probe.title : undefined;
  const env = item.type === 'project' ? item.project.env : s?.env ?? (item.type === 'offline' ? item.fav.env : undefined);
  const port = s?.port ?? (item.type === 'project' ? item.project.port : undefined);

  return (
    <article className={`card card--${item.status}`}>
      <header className="card__top">
        <StatusLamp item={item} />
        <div className="card__tags">
          <KindTag item={item} />
          {env && <span className="tag">{ENV_LABEL[env]}</span>}
          {item.type === 'project' && <span className="tag">PROJECT</span>}
          <OwnerTag item={item} />
        </div>
        <Star on={item.favourite} onClick={() => actions.toggleFavourite(item)} name={item.name} />
      </header>

      {form ? (
        <CardForm item={item} mode={form} actions={actions} onDone={() => setForm(undefined)} />
      ) : (
        <>
          <h3 className="card__name" title={item.discoveredName ? `${item.name} (discovered as ${item.discoveredName})` : item.name}>
            {item.name}
          </h3>
          {title && (
            <p className="card__title" title={title}>
              “{title}”
            </p>
          )}

          <dl className="card__meta">
            {item.url && (
              <div className="card__url">
                <dt>URL</dt>
                <dd>
                  <code>{item.url}</code>
                </dd>
              </div>
            )}
            {item.folder && (
              <div>
                <dt>{item.folderSource ? FOLDER_LABEL[item.folderSource] : 'Dir'}</dt>
                <dd title={`${item.folder}${item.folderSource ? ` (${FOLDER_HINT[item.folderSource]})` : ''}`}>
                  <code className="path">{shortPath(item.folder)}</code>
                  {item.folderSource === 'user' && <span className="pin" aria-label="set by you"> •</span>}
                </dd>
              </div>
            )}
            {(s?.processName || s?.pid) && (
              <div>
                <dt>Proc</dt>
                <dd title={s.commandLine}>
                  <code>
                    {s.processName ?? '?'}
                    {s.pid !== undefined && <span className="dim"> · {s.pid}</span>}
                  </code>
                </dd>
              </div>
            )}
            {item.status !== 'live' && (
              <div>
                <dt>Note</dt>
                <dd title={item.statusDetail}>{item.statusDetail}</dd>
              </div>
            )}
          </dl>
          {item.type === 'project' &&
            item.warnings.map((w) => (
              <p key={w} className="card__warn" role="status">
                ⚠ {w}
              </p>
            ))}
          {item.type === 'project' && <RunControls item={item} actions={actions} />}
        </>
      )}

      <footer className="card__actions">
        <span className="card__port">{port !== undefined ? `:${port}` : ''}</span>
        <ItemMenu item={item} actions={actions} onForm={!form ? setForm : undefined} />
        {item.type === 'project' &&
          item.editors.map((e) => (
            <a key={e.label} className="btn btn--small btn--editor" href={e.href} title={`Open the folder in ${e.label}`}>
              {e.label}
            </a>
          ))}
        <OpenLink item={item} />
      </footer>
    </article>
  );
}

/** Compact row for APIs, raw TCP listeners and hidden services. */
export function Row({ item, actions }: { item: Item; actions: CardActions }) {
  const [form, setForm] = useState<FormMode>();
  if (item.type !== 'service') return null;
  const s = item.service;
  return (
    <li className="row">
      <Star on={item.favourite} onClick={() => actions.toggleFavourite(item)} name={item.name} />
      <span className="row__port">{s.port}</span>
      <StatusLamp item={item} />
      <span className="row__tags">
        <span className="tag">{ENV_LABEL[s.env]}</span>
        <KindTag item={item} />
        <OwnerTag item={item} />
      </span>
      <span className="row__name" title={s.commandLine ?? item.name}>
        {item.name}
        {s.processName && s.nameSource !== 'process' && <span className="dim"> · {s.processName}</span>}
      </span>
      <span className="row__detail" title={item.statusDetail}>
        {item.statusDetail}
      </span>
      <span className="row__actions">
        {item.kind !== 'other' && item.status !== 'offline' && <OpenLink item={item} compact />}
        <ItemMenu item={item} actions={actions} onForm={!form ? setForm : undefined} />
      </span>
      {form && (
        <div className="row__edit">
          <CardForm item={item} mode={form} actions={actions} onDone={() => setForm(undefined)} />
        </div>
      )}
    </li>
  );
}
