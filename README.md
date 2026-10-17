# ThesisPartner

## Comptes de démonstration pour le client

| Espace    | Nom               | Email                         | Mot de passe         |
| --------- | ----------------- | ----------------------------- | -------------------- |
| Doctorant | Youssef El Amrani | `demo.doctorant@example.test` | `ThesisPartner2026!` |
| Encadrant | Nora Bernard      | `demo.encadrant@example.test` | `ThesisPartner2026!` |

Après installation et application des migrations, `npm run db:seed:demo` crée les deux comptes et leur thèse de démonstration. Les identifiants sont réservés aux données fictives. Suivre le [guide de démonstration client](docs/demo-client.md) pour installer et tester les deux espaces.

ThesisPartner est une plateforme web de suivi de thèse, prévue pour le doctorant et l’encadrant. Cette phase pose la fondation : monorepo, API, shell responsive, PostgreSQL, Redis, tests et CI. Les modules métier (objectifs, livrables, remarques, réunions, veille, Research Radar, portfolio, assistant) ne sont pas encore implémentés.

L’application est une interface web responsive, desktop d’abord. Ce n’est pas une application mobile native.

## Stack

- Frontend : React, TypeScript strict, Vite, React Router, TanStack Query, React Hook Form, Zod, Tailwind CSS
- Backend : NestJS, REST, OpenAPI
- Données : PostgreSQL, Prisma
- Infrastructure : Redis, Docker Compose, GitHub Actions
- Qualité : ESLint, Prettier, Jest, Vitest, Playwright

## Architecture

```
Navigateur
    ↓
apps/web          shell React, état serveur via TanStack Query
    ↓
apps/api          monolithe modulaire NestJS, /api/v1
    ↓
Prisma            règles d’accès à la thèse à côté des dépôts
    ↓
PostgreSQL        users, profiles, theses, thesis_memberships, sessions, audit_logs
Redis             connexion vérifiée ; cache, files et rate limit distribué plus tard
```

Le détail est dans [docs/architecture/overview.md](docs/architecture/overview.md). Le choix du monolithe modulaire est expliqué dans [docs/architecture/decisions/0001-modular-monolith.md](docs/architecture/decisions/0001-modular-monolith.md).

## Prérequis

- Node.js 22 ou plus récent
- npm 11
- Docker et Docker Compose, pour PostgreSQL, Redis et Mailpit

## Installation

```bash
npm ci
cp .env.example .env
npm run dev:infra
npm run db:migrate
npm run dev
```

- Interface : http://localhost:5173
- API : http://localhost:3000/api/v1/health
- OpenAPI (hors production) : http://localhost:3000/docs
- Mailpit : http://localhost:8025

`npm run dev` construit d’abord les packages partagés, puis lance l’API et le frontend. Le frontend proxifie `/api` et `/docs` vers l’API, ce qui prépare les cookies de session same-origin.

## Variables d’environnement

Le fichier lu est `.env` à la racine. Aucun secret de production n’y figure. Les valeurs de `.env.example` ne servent qu’au développement local.

| Variable            | Rôle                                        |
| ------------------- | ------------------------------------------- |
| `NODE_ENV`          | `development`, `test` ou `production`       |
| `APP_URL`           | Origine autorisée par CORS                  |
| `API_PORT`          | Port HTTP de l’API                          |
| `DATABASE_URL`      | PostgreSQL de développement                 |
| `TEST_DATABASE_URL` | PostgreSQL réservée aux tests d’intégration |
| `REDIS_URL`         | Redis                                       |
| `LOG_LEVEL`         | `silent`, `info`, `warn`, `error`           |
| `TRUST_PROXY`       | `true` derrière le reverse proxy Docker     |

L’API refuse de démarrer si une variable obligatoire est absente ou invalide. Le message ne contient pas la valeur, seulement le nom du champ.

## Docker

```bash
docker compose up -d --wait postgres redis mailpit
```

Pour lancer aussi les images de l’API et du frontend :

```bash
docker compose up --build
```

L’interface conteneurisée est servie sur http://localhost:8080. Nginx proxifie `/api` et `/docs` vers l’API. Au démarrage du conteneur API, les migrations Prisma sont appliquées puis le processus Node démarre.

Mailpit est présent pour la phase d’authentification. Il n’est pas encore utilisé par le code.

## Migrations

Les commandes passent par des scripts qui chargent le `.env` racine.

```bash
npm run db:migrate:dev    # crée et applique une migration en développement
npm run db:migrate        # applique les migrations déjà commises
npm run db:reset          # recrée la base de développement
```

La production n’utilise pas `db push`. Elle applique les migrations commises (`prisma migrate deploy`), comme le conteneur API. Le guide est dans [docs/architecture/database.md](docs/architecture/database.md).

Les tests d’intégration créent si besoin la base `thesispartner_test`, y appliquent les mêmes migrations, puis s’y connectent. Ils n’écrivent pas dans la base de développement.

## Tests

```bash
npm test                  # unitaires API et composants frontend
npm run test:integration  # API, PostgreSQL de test, Redis
npm run test:e2e          # Playwright, shell et navigation
```

## Lint, types et build

```bash
npm run lint
npm run typecheck
npm run build
```

La CI GitHub Actions enchaîne installation, tests d’intégration, lint, types, tests unitaires et builds. Un job séparé exécute Playwright.

## Phase 0

Inclus : shell, health check, validation, erreurs uniformes, request id, journaux, Prisma, Redis, Argon2id, politique d’accès à une thèse.

## Comptes et thèses

Inscription, connexion, déconnexion, confirmation d’adresse, réinitialisation de mot de passe, session par cookie et isolation des thèses. Le détail est dans `docs/security/authentication.md`.

Les modules de suivi restent des pages vides. Le tableau de bord n’invente pas de doctorant : le nom affiché vient du compte connecté. Avec Docker Compose, les messages partent vers Mailpit (`http://localhost:8025`). Sans `SMTP_HOST`, le développement les écrit dans la sortie de l’API.
