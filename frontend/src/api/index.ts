import type { ApiClient } from './client';
import { httpApi } from './http/httpApi';

/** Mode démonstration : toutes les données viennent de src/mocks/ (aucun backend). */
export const DEMO_MODE = import.meta.env.VITE_USE_MOCKS === 'true';

// Import dynamique : le code de simulation n'est pas chargé hors mode démo.
export const api: ApiClient = DEMO_MODE ? (await import('../mocks/mockApi')).mockApi : httpApi;

export { ApiError, errorMessage } from './client';
export type { ApiClient } from './client';
