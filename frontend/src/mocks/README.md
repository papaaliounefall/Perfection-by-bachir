# src/mocks — simulation (mode démo uniquement)

Tout ce qui est **fictif** dans le frontend est ici, et nulle part ailleurs.

| Fichier | Contenu |
|---|---|
| `mockApi.ts` | Implémentation en mémoire de `ApiClient` (comptes, rendez-vous, disponibilités, workflow). Reproduit les règles du backend. |
| `demoCatalog.ts` | Catalogue et galerie issus de la maquette AI Studio (tarifs et textes **non validés**). |
| `demoContent.ts` | Avis clients et chiffres clés **inventés**. |

Activation : `npm run dev:mock` (charge `.env.mock`, `VITE_USE_MOCKS=true`).
Hors mode démo, ce dossier n'est jamais chargé (import dynamique dans `api/index.ts`).

Comptes démo (mot de passe `demo`) : `client@demo.local`, `manager@demo.local`, `technicien@demo.local`.

Règle : un composant ne doit **jamais** importer depuis `mocks/`, seulement depuis `api/`.
Exception unique : l'aide « comptes démo » de l'écran de connexion, chargée dynamiquement.
