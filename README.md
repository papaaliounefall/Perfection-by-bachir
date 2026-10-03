# Perfection By Bachir Ndour

Plateforme de gestion d’un atelier de detailing automobile à Dakar : site public avec réservation en ligne,
espace client (carnet digital) et espace professionnel (planning et CRM).

Cahier des charges : [docs/cahier-des-charges.md](docs/cahier-des-charges.md)

## Structure

```
backend/    API Django REST Framework (/api/v1/) + administration Django (/admin/)
  apps/accounts      utilisateurs, rôles (client, technicien, manager, admin), auth par session
  apps/customers     fiches clients, notes internes, formulaire de contact
  apps/employees     équipe
  apps/vehicles      véhicules + photo privée (un client ne voit que les siens)
  apps/catalog       prestations
  apps/appointments  rendez-vous : workflow, disponibilités, historique des statuts
  apps/notifications notifications client (in-app + email) et équipe (in-app)
  apps/workshop      étapes de traitement, photos d'inspection / Avant / Après
  apps/billing       factures INV-AAAA-XXXX, paiements, remboursements, PDF
  apps/gallery       réalisations, avis clients, chiffres clés (publiés après validation)
  apps/analytics     statistiques et exports CSV
  apps/demo          commande seed_demo (données fictives, développement uniquement)
frontend/   React + TypeScript + Vite + Tailwind
  src/api/           contrat ApiClient + implémentation HTTP (seul point d'accès aux données)
  src/mocks/         TOUTE la simulation (mode démo uniquement, jamais chargée sinon)
  src/components/    public/ (site + réservation), customer/, admin/, auth/, ui/
docs/       cahier des charges
```

## Démarrage

### Avec Docker Desktop (recommandé)

```bash
docker compose up -d --build
# Facultatif : données de démonstration (comptes *@demo.perfection.local)
docker compose exec backend python manage.py seed_demo --password "Demo-Perfection-2026" --force
```

Puis ouvrir **http://localhost:8080** (site, espaces connectés et `/admin/`). PostgreSQL, Django (Gunicorn) et
Nginx tournent dans trois conteneurs ; base et photos sont conservées dans des volumes Docker.
Arrêter : `docker compose down` (les données restent) · Mettre à jour après un changement : `docker compose up -d --build`.
Personnaliser (clé secrète, identité de facturation…) : copier `.env.docker.example` vers `.env`.

> La clé secrète par défaut ne convient qu'à un usage local : en définir une vraie avant toute mise en ligne.

### Sans Docker (développement)

**Backend** (Python 3.12+)

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate            # Windows ; sous Linux/macOS : source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # DJANGO_DEBUG=true pour le développement
python manage.py migrate
python manage.py seed_demo --password "<mot-de-passe-demo>"   # optionnel : données fictives
python manage.py runserver
```

Sans `POSTGRES_DB` dans `.env`, SQLite est utilisé. Pour PostgreSQL : `docker compose up -d`, puis renseignez `POSTGRES_*`.

**Frontend** (Node 20+)

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000, /api est redirigé vers Django (port 8000)
npm run dev:mock   # mode démo : données simulées en mémoire, aucun backend nécessaire
```

## Règles du projet

- **Aucune donnée fictive hors de `frontend/src/mocks/` et `backend/apps/demo/`.** En mode réel, un contenu non
  validé (chiffres clés, avis, galerie, coordonnées) n’est tout simplement pas affiché.
- **Les droits sont vérifiés côté serveur.** Le statut d’un rendez-vous n’est jamais écrit directement : seules les
  actions `POST /appointments/{id}/transition/` le font évoluer, selon le rôle ; le serveur renvoie
  `allowed_actions` et l’interface n’affiche que celles-ci.
- **Les disponibilités sont calculées par le serveur** (horaires, fermetures, durée, capacité, marge) et
  revérifiées sous verrou à la réservation : pas de double réservation.
- Horaires d’ouverture, fermetures, utilisateurs et rôles se gèrent dans `/admin/`.

## Tests

```bash
cd backend && python manage.py test apps
cd frontend && npm run lint && npm run build
```

## Avancement (phases du cahier des charges)

| Phase | Contenu | API | Interface |
|---|---|---|---|
| 1 — Socle | Auth, rôles, mot de passe oublié, prestations, clients, véhicules (+ photo), rendez-vous, réservation, dashboard | Fait | Fait |
| 2 — Atelier | Étapes de traitement, photos inspection / Avant / Après, avancement réel | Fait | À faire (espace pro) |
| 3 — Finances | Factures, paiements, remboursements, PDF | Fait | Client : factures + PDF. Espace pro : à faire |
| 4 — Contenu & analyse | Galerie, avis, chiffres clés, statistiques, CSV, notifications | Fait | Site public + notifications : fait. Espace pro : à faire |
| 5 — Évolutions | Paiement API, WhatsApp/SMS, mobile | À faire | À faire |

En attendant les écrans de l'espace pro, l'administrateur gère factures, galerie et contenus dans `/admin/`.
Reste aussi : routage par URL (React Router) pour le SEO, stockage objet des médias (S3/R2), déploiement
(Docker, Nginx, Gunicorn).

Documentation fonctionnelle (rôles, parcours, modules) : [Word](docs/guide-fonctionnement.docx) · [PDF](docs/guide-fonctionnement.pdf)
