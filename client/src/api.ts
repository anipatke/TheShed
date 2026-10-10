import type { Env, Favourite, HideRule, State } from '../../shared/types.ts';

async function call(path: string, init?: RequestInit): Promise<State> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const body = (await res.json().catch(() => ({}))) as State & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  state: (refresh = false) => call(refresh ? '/api/state?refresh=1' : '/api/state'),
  addManual: (name: string, url: string, folder?: string) => call('/api/manual', json('POST', { name, url, folder })),
  editManual: (id: string, p: { name: string; url: string; folder?: string }) =>
    call(`/api/manual/${encodeURIComponent(id)}`, json('PUT', p)),
  setOverride: (key: string, o: { name?: string; folder?: string }) => call('/api/overrides', json('PUT', { key, ...o })),
  removeManual: (id: string) => call(`/api/manual/${encodeURIComponent(id)}`, json('DELETE', {})),
  setFavourite: (fav: Omit<Favourite, 'lastSeen'>, favourite: boolean) =>
    call('/api/favourites', json('PUT', { ...fav, favourite })),
  hide: (rule: { kind: 'port'; env: Env; port: number } | { kind: 'process'; env: Env; process: string }) =>
    call('/api/hidden', json('POST', rule)),
  unhide: (rule: HideRule) => call(`/api/hidden/${encodeURIComponent(rule.id)}`, json('DELETE', {})),
};
