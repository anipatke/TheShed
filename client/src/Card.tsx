import { useEffect, useRef, useState } from 'react';
import type { Service } from '../../shared/types.ts';
import { ENV_LABEL, KIND_LABEL, looksLikeFolder, safeHref, STATUS_LABEL, type Item } from './model.ts';

export interface CardActions {
  toggleFavourite: (item: Item) => void;
  hidePort: (service: Service) => void;
  hideProcess: (service: Service) => void;
  unhide: (item: Item) => void;
  removeManual: (id: string) => void;
  /** Save a name/folder (and URL for manual projects). Empty strings clear. Rejects with a message. */
  save: (item: Item, edit: { name: string; folder: string; url: string }) => Promise<void>;
}

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

function ItemMenu({ item, actions, onEdit }: { item: Item; actions: CardActions; onEdit?: () => void }) {
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
            {item.type === 'manual' ? 'Edit…' : 'Rename / set folder…'}
          </button>
        );
        if (item.type === 'offline') return edit;
        if (item.type === 'manual') {
          return (
            <>
              {edit}
              <button type="button" role="menuitem" onClick={act(() => actions.removeManual(item.project.id))}>
                Remove project
              </button>
            </>
          );
        }
        const s = item.service;
        if (item.hiddenBy) {
          return (
            <>
              {edit}
              <button type="button" role="menuitem" onClick={act(() => actions.unhide(item))}>
                Unhide
              </button>
            </>
          );
        }
        return (
          <>
            {edit}
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

function EditForm({ item, actions, onDone }: { item: Item; actions: CardActions; onDone: () => void }) {
  const isManual = item.type === 'manual';
  const userFolder = item.folderSource === 'user' ? item.folder ?? '' : '';
  const [name, setName] = useState(isManual ? item.name : item.type === 'service' ? item.override?.name ?? '' : item.name);
  const [folder, setFolder] = useState(userFolder);
  const [url, setUrl] = useState(item.url);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.select(), []);

  const placeholderName = item.type === 'service' ? item.discoveredName ?? item.service.name : '';
  const placeholderFolder = item.folderSource && item.folderSource !== 'user' ? item.folder : '/home/me/code/app or C:\\dev\\app';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (folder.trim() && !looksLikeFolder(folder.trim())) return setError('Folder must be an absolute path');
    if (isManual && !safeHref(url.trim())) return setError('Enter a full http:// or https:// URL');
    setBusy(true);
    setError(undefined);
    try {
      await actions.save(item, { name: name.trim(), folder: folder.trim(), url: url.trim() });
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
        <input ref={first} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={placeholderName} required={isManual} />
      </label>
      {isManual && (
        <label>
          <span>URL</span>
          <input className="mono" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={2000} spellCheck={false} required />
        </label>
      )}
      <label>
        <span>Folder</span>
        <input className="mono" value={folder} onChange={(e) => setFolder(e.target.value)} maxLength={1000} spellCheck={false} placeholder={placeholderFolder} />
      </label>
      {!isManual && <p className="edit__hint">Leave blank to use what was discovered.</p>}
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

const FOLDER_LABEL = { cwd: 'Dir', commandLine: 'Dir?', user: 'Dir' } as const;
const FOLDER_HINT = { cwd: 'working directory', commandLine: 'inferred from command line', user: 'set by you' } as const;

export function Card({ item, actions }: { item: Item; actions: CardActions }) {
  const [editing, setEditing] = useState(false);
  const s = item.type === 'service' ? item.service : undefined;
  const title = s?.probe.title && s.probe.title !== item.name ? s.probe.title : undefined;
  const env = s?.env ?? (item.type === 'offline' ? item.fav.env : undefined);

  return (
    <article className={`card card--${item.status}`}>
      <header className="card__top">
        <StatusLamp item={item} />
        <div className="card__tags">
          <KindTag item={item} />
          {env && <span className="tag">{ENV_LABEL[env]}</span>}
          {item.type === 'manual' && <span className="tag">MANUAL</span>}
        </div>
        <Star on={item.favourite} onClick={() => actions.toggleFavourite(item)} name={item.name} />
      </header>

      {editing ? (
        <EditForm item={item} actions={actions} onDone={() => setEditing(false)} />
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
            <div className="card__url">
              <dt>URL</dt>
              <dd>
                <code>{item.url}</code>
              </dd>
            </div>
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
        </>
      )}

      <footer className="card__actions">
        <span className="card__port">{s ? `:${s.port}` : ''}</span>
        <ItemMenu item={item} actions={actions} onEdit={!editing ? () => setEditing(true) : undefined} />
        <OpenLink item={item} />
      </footer>
    </article>
  );
}

/** Compact row for APIs, raw TCP listeners and hidden services. */
export function Row({ item, actions }: { item: Item; actions: CardActions }) {
  if (item.type !== 'service') return null;
  const s = item.service;
  return (
    <li className="row">
      <span className="row__port">{s.port}</span>
      <StatusLamp item={item} />
      <span className="row__tags">
        <span className="tag">{ENV_LABEL[s.env]}</span>
        <KindTag item={item} />
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
        <ItemMenu item={item} actions={actions} />
      </span>
    </li>
  );
}
