import type { Env, Favourite, HideRule, Project, State } from '../../shared/types.ts';

/** A project as typed into the form; the server assigns the id and infers a missing environment from the folder. */
export type ProjectDraft = Omit<Project, 'id'>;

async function call(path: string, init?: RequestInit): Promise<State> {
  const res = await fetch(path, {
    ...init,
    // X-Shed marks a request as coming from this page; the server refuses mutations without it.
    headers: { ...(init?.body && { 'Content-Type': 'application/json' }), 'X-Shed': '1' },
  });
  const body = (await res.json().catch(() => ({}))) as State & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  state: (refresh = false) => call(refresh ? '/api/state?refresh=1' : '/api/state'),
  /** `fromKey` is the discovered card being registered: its favourite and rename move to the new project. */
  addProject: (draft: ProjectDraft, fromKey?: string) => call('/api/projects', json('POST', { ...draft, fromKey })),
  editProject: (id: string, draft: ProjectDraft) => call(`/api/projects/${encodeURIComponent(id)}`, json('PUT', draft)),
  startProject: (id: string) => call(`/api/projects/${encodeURIComponent(id)}/start`, json('POST', {})),
  stopProject: (id: string) => call(`/api/projects/${encodeURIComponent(id)}/stop`, json('POST', {})),
  restartProject: (id: string) => call(`/api/projects/${encodeURIComponent(id)}/restart`, json('POST', {})),
  /** Recent output of the project's latest run, as plain text. */
  projectLog: async (id: string): Promise<string> => {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}/log`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return res.text();
  },
  setOverride: (key: string, o: { name?: string; folder?: string }) => call('/api/overrides', json('PUT', { key, ...o })),
  removeProject: (id: string) => call(`/api/projects/${encodeURIComponent(id)}`, json('DELETE', {})),
  setFavourite: (fav: Omit<Favourite, 'lastSeen'>, favourite: boolean) =>
    call('/api/favourites', json('PUT', { ...fav, favourite })),
  hide: (rule: { kind: 'port'; env: Env; port: number } | { kind: 'process'; env: Env; process: string }) =>
    call('/api/hidden', json('POST', rule)),
  unhide: (rule: HideRule) => call(`/api/hidden/${encodeURIComponent(rule.id)}`, json('DELETE', {})),
};
