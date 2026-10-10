import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Service, State } from '../../shared/types.ts';
import { api } from './api.ts';
import { Card, Row, type CardActions } from './Card.tsx';
import { buildSections, ENV_LABEL, timeAgo, type Item } from './model.ts';
import { ProjectForm } from './ProjectForm.tsx';
import { isTransitioning } from './runs.ts';

const AUTO_REFRESH_MS = 15_000;
/** How often to ask for run state while a launch is starting or stopping. */
const RUN_POLL_MS = 1000;

function readAuto(): boolean {
  try {
    return localStorage.getItem('shed.auto') !== 'off';
  } catch {
    return true;
  }
}

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 15 16 5l12 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
      <rect x="9" y="17" width="14" height="2.5" />
      <rect x="9" y="21.5" width="14" height="2.5" opacity=".7" />
      <rect x="9" y="26" width="14" height="2.5" opacity=".45" />
    </svg>
  );
}

function Section({
  id,
  title,
  hint,
  items,
  actions,
  layout,
  collapsible,
  defaultOpen = true,
  empty,
}: {
  id: string;
  title: string;
  hint?: string;
  items: Item[];
  actions: CardActions;
  layout: 'cards' | 'rows';
  collapsible?: boolean;
  defaultOpen?: boolean;
  empty?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items.length && !empty) return null;
  const body =
    items.length === 0 ? (
      <div className="empty">{empty}</div>
    ) : layout === 'cards' ? (
      <div className="grid">
        {items.map((item) => (
          <Card key={item.key} item={item} actions={actions} />
        ))}
      </div>
    ) : (
      <ul className="rows">
        {items.map((item) => (
          <Row key={item.key} item={item} actions={actions} />
        ))}
      </ul>
    );

  return (
    <section className="section" aria-labelledby={`h-${id}`}>
      <h2 id={`h-${id}`} className="section__head">
        {collapsible ? (
          <button type="button" className="section__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span className="chevron" aria-hidden="true" />
            {title}
          </button>
        ) : (
          title
        )}
        <span className="section__count">{items.length}</span>
        {hint && <span className="section__hint">{hint}</span>}
      </h2>
      {(!collapsible || open) && body}
    </section>
  );
}

export function App() {
  const [state, setState] = useState<State>();
  const [error, setError] = useState<string>();
  const [scanning, setScanning] = useState(false);
  const [auto, setAuto] = useState(readAuto);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  /** Start/stop requests the server has not answered yet; the answer waits on a fresh scan. */
  const [inFlight, setInFlight] = useState(0);
  const scanningRef = useRef(false);

  const refresh = useCallback(async (force: boolean) => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    try {
      setState(await api.state(force));
      setError(undefined);
    } catch (err) {
      setError(err instanceof TypeError ? 'The Shed server is not responding. Is it still running?' : (err as Error).message);
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  useEffect(() => {
    try {
      localStorage.setItem('shed.auto', auto ? 'on' : 'off');
    } catch {
      /* storage unavailable */
    }
    if (!auto) return;
    const t = setInterval(() => document.visibilityState === 'visible' && void refresh(true), AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [auto, refresh]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  // Mutations return fresh state; surface failures without losing what's on screen.
  const mutate = useCallback(async (fn: () => Promise<State>) => {
    try {
      setState(await fn());
      setError(undefined);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  // While a run is starting or stopping its state changes by itself; ask often, then rescan once it settles.
  const transitioning = inFlight > 0 || (state?.runs.some(isTransitioning) ?? false);
  useEffect(() => {
    if (!transitioning) return;
    const t = setInterval(() => {
      api.state(false).then(setState, () => undefined);
    }, RUN_POLL_MS);
    return () => {
      clearInterval(t);
      void refresh(true);
    };
  }, [transitioning, refresh]);

  const actions: CardActions = useMemo(
    () => ({
      toggleFavourite: (item) => {
        if (item.type === 'offline') return void mutate(() => api.setFavourite(item.fav, false));
        const key = item.type === 'service' ? item.service.favouriteKey : `project:${item.project.id}`;
        const env = item.type === 'service' ? item.service.env : item.project.env;
        void mutate(() => api.setFavourite({ key, name: item.name, url: item.url, env }, !item.favourite));
      },
      // Throws on failure so the edit form can show the message and stay open.
      save: async (item, edit) => {
        if (item.type === 'project') return;
        const key = item.type === 'service' ? item.service.favouriteKey : item.fav.key;
        setState(await api.setOverride(key, { name: edit.name || undefined, folder: edit.folder || undefined }));
        setError(undefined);
      },
      saveProject: async (id, draft) => {
        setState(await api.editProject(id, draft));
        setError(undefined);
      },
      registerProject: async (draft, fromKey) => {
        setState(await api.addProject(draft, fromKey));
        setError(undefined);
      },
      // Throws on refusal so the card can show the server's reason beside its button.
      runAction: async (id, action) => {
        setInFlight((n) => n + 1);
        try {
          setState(await (action === 'start' ? api.startProject(id) : action === 'stop' ? api.stopProject(id) : api.restartProject(id)));
          setError(undefined);
        } finally {
          setInFlight((n) => n - 1);
        }
      },
      hidePort: (s: Service) => void mutate(() => api.hide({ kind: 'port', env: s.env, port: s.port })),
      hideProcess: (s: Service) =>
        s.processName && void mutate(() => api.hide({ kind: 'process', env: s.env, process: s.processName! })),
      unhide: (item) => item.type === 'service' && item.hiddenBy && void mutate(() => api.unhide(item.hiddenBy!)),
      removeProject: (id) => void mutate(() => api.removeProject(id)),
    }),
    [mutate],
  );

  const sections = useMemo(() => (state ? buildSections(state, query.trim()) : undefined), [state, query]);
  const scan = state?.scan;
  const failed = scan?.sources.filter((s) => !s.ok) ?? [];

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <Logo />
          <div>
            <h1>The Shed</h1>
            <p className="brand__sub">localhost workbench</p>
          </div>
        </div>

        <div className="scanbar">
          {scan && (
            <p className="scanbar__meta" aria-live="polite">
              <span title={new Date(scan.scannedAt).toLocaleString()}>Scanned {timeAgo(scan.scannedAt, now)}</span>
              <span className="dim"> · {(scan.durationMs / 1000).toFixed(1)}s</span>
              {scan.sources.map((s) => (
                <span key={s.env} className={`source${s.ok ? '' : ' source--bad'}`} title={s.error ?? s.method}>
                  {ENV_LABEL[s.env]} {s.ok ? s.count : '✕'}
                </span>
              ))}
            </p>
          )}
          <label className="switch" title="Rescan every 15 seconds while this tab is visible">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            <span className="switch__track" aria-hidden="true" />
            Auto
          </label>
          <button type="button" className="btn btn--primary" onClick={() => void refresh(true)} disabled={scanning}>
            <svg className={`refresh${scanning ? ' refresh--spin' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" />
            </svg>
            {scanning ? 'Scanning…' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Filter by name, port, folder, process…"
          aria-label="Filter services"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {!adding && (
          <button type="button" className="btn btn--ghost" onClick={() => setAdding(true)}>
            + Add project
          </button>
        )}
        {scan && (
          <button type="button" className="btn btn--ghost" aria-expanded={notesOpen} onClick={() => setNotesOpen((o) => !o)}>
            Discovery notes{failed.length ? ` (${failed.length} failed)` : ''}
          </button>
        )}
      </div>

      {adding && (
        <ProjectForm variant="add" submitLabel="Add project" onSubmit={(d) => actions.registerProject(d)} onClose={() => setAdding(false)} />
      )}

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      )}
      {failed.map((s) => (
        <div key={s.env} className="banner" role="status">
          <strong>{ENV_LABEL[s.env]} discovery unavailable:</strong> {s.error}. Other sources still work.
        </div>
      ))}

      {notesOpen && scan && (
        <div className="notes">
          <p>
            Server running in <strong>{ENV_LABEL[scan.host.env]}</strong>
            {scan.host.networkingMode && <> · WSL networking: <strong>{scan.host.networkingMode}</strong></>}
          </p>
          <ul>
            {scan.sources.map((s) => (
              <li key={s.env}>
                <strong>{ENV_LABEL[s.env]}</strong> via {s.method} — {s.ok ? `${s.count} listeners in ${s.ms} ms` : `failed: ${s.error}`}
                {s.notes.map((n) => (
                  <div key={n} className="dim">
                    {n}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!state && !error && <div className="loading">Scanning localhost…</div>}

      {state && sections && (
        <main>
          <Section id="fav" title="Favourites" items={sections.favourites} actions={actions} layout="cards" />
          <Section
            id="projects"
            title="Projects"
            hint="websites with a project folder"
            items={sections.projects}
            actions={actions}
            layout="cards"
            empty={
              query ? (
                'Nothing matches that filter.'
              ) : (
                <>
                  No dev servers found. Start one (e.g. <code>npm run dev</code>) and hit Refresh, or add a project.
                </>
              )
            }
          />
          <Section id="pages" title="Other web pages" hint="HTML on localhost, no project folder found" items={sections.pages} actions={actions} layout="cards" />
          <Section
            id="other"
            title="Other listeners"
            hint="APIs and non-HTTP services"
            items={sections.other}
            actions={actions}
            layout="rows"
            collapsible
            defaultOpen={false}
          />
          <Section id="hidden" title="Hidden" items={sections.hidden} actions={actions} layout="rows" collapsible defaultOpen={false} />
          {state.config.hidden.length > 0 && (
            <div className="rules">
              <span className="dim">Hide rules:</span>
              {state.config.hidden.map((r) => (
                <span key={r.id} className="chip">
                  {ENV_LABEL[r.env]} {r.kind === 'port' ? `port ${r.port}` : r.process}
                  <button type="button" aria-label="Remove hide rule" title="Remove rule" onClick={() => void mutate(() => api.unhide(r))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </main>
      )}

      <footer className="colophon">
        Bound to 127.0.0.1 · settings saved to a local JSON file · discovery is read-only; only projects you start here can be stopped here
      </footer>
    </div>
  );
}
