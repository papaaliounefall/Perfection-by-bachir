import { ApiError } from '../client';

const BASE = '/api/v1';
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

let csrfReady: Promise<void> | null = null;

/** Le cookie csrftoken est déposé par /auth/csrf/ ; requis avant toute écriture. */
function ensureCsrf() {
  if (readCookie('csrftoken')) return Promise.resolve();
  csrfReady ??= fetch(`${BASE}/auth/csrf/`, { credentials: 'same-origin' }).then(() => undefined);
  return csrfReady;
}

/** Aplatit les erreurs DRF ({champ: [msg]} ou {detail}) en un message lisible. */
function toApiError(status: number, body: unknown): ApiError {
  if (body && typeof body === 'object') {
    const data = body as Record<string, unknown>;
    if (typeof data.detail === 'string') return new ApiError(data.detail, status);
    const fields: Record<string, string[]> = {};
    const messages: string[] = [];
    const walk = (value: unknown, key: string) => {
      if (Array.isArray(value)) value.forEach((v) => walk(v, key));
      else if (value && typeof value === 'object')
        Object.entries(value).forEach(([k, v]) => walk(v, k));
      else if (value != null) {
        (fields[key] ??= []).push(String(value));
        messages.push(String(value));
      }
    };
    Object.entries(data).forEach(([k, v]) => walk(v, k));
    if (messages.length) return new ApiError(messages.join(' '), status, fields);
  }
  // 403 sans réponse JSON : rejet par la protection CSRF de Django (page expirée ou adresse du site non déclarée)
  if (status === 403 && body == null)
    return new ApiError('Requête bloquée par la protection de sécurité. Rechargez la page puis réessayez.', status);
  if (status === 401 || status === 403) return new ApiError('Accès refusé. Veuillez vous connecter.', status);
  return new ApiError(`Erreur serveur (${status}).`, status);
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (UNSAFE.has(method)) {
    await ensureCsrf();
    headers['X-CSRFToken'] = readCookie('csrftoken');
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Serveur injoignable. Vérifiez votre connexion.', 0);
  }

  if (response.status === 204) return undefined as T;
  const data = response.headers.get('content-type')?.includes('json') ? await response.json() : null;
  if (!response.ok) throw toApiError(response.status, data);
  return data as T;
}

/** Envoi multipart (fichiers). Le navigateur fixe lui-même le Content-Type. */
export async function upload<T>(path: string, form: FormData): Promise<T> {
  await ensureCsrf();
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-CSRFToken': readCookie('csrftoken') },
      credentials: 'same-origin',
      body: form,
    });
  } catch {
    throw new ApiError('Serveur injoignable. Vérifiez votre connexion.', 0);
  }
  const data = response.headers.get('content-type')?.includes('json') ? await response.json() : null;
  if (!response.ok) throw toApiError(response.status, data);
  return data as T;
}

interface Page<T> {
  results: T[];
  next: string | null;
}

/** Récupère toutes les pages d'une liste paginée DRF. */
export async function requestAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let url: string | null = `${path}${path.includes('?') ? '&' : '?'}page_size=200`;
  while (url) {
    const page: Page<T> | T[] = await request<Page<T> | T[]>('GET', url);
    if (Array.isArray(page)) return page;
    items.push(...page.results);
    url = page.next ? page.next.slice(page.next.indexOf(BASE) + BASE.length) : null;
  }
  return items;
}
