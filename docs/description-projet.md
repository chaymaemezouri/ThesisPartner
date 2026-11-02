# Thesis Flow — description détaillée du projet

**Thesis Flow** (nom technique / monorepo : `thesispartner`) est une plateforme web SaaS de **suivi et de co-encadrement de thèse de doctorat**. Elle organise le travail quotidien du doctorant et celui de l’encadrant autour d’une même thèse : objectifs, livrables versionnés, remarques, réunions, messagerie, portfolio, ressources pédagogiques, tableau de suivi multi-doctorants, et outils d’aide à la recherche.

L’interface est une application web **responsive, desktop d’abord** (pas d’application mobile native). La langue de l’UI se choisit dans les paramètres (**anglais** par défaut, **français** disponible).

Marque produit visible dans l’interface : **EzzInnov Thesis Flow**.

---

## 1. Problème adressé

Le parcours doctoral repose sur un suivi long (plusieurs années), des jalons scientifiques, des échanges asymétriques (doctorant / encadrant) et une traçabilité souvent dispersée (e-mails, fichiers locaux, tableurs). Thesis Flow centralise ce suivi dans un espace partagé :

- le **doctorant** structure sa thèse, dépose des versions, répond aux retours et suit sa progression ;
- l’**encadrant** supervise un ou plusieurs doctorants, valide les livrables, planifie les séances et dispose d’un **bureau de suivi** agrégé ;
- un **super-administrateur** de plateforme gère utilisateurs, invitations, audit et abonnements.

---

## 2. Utilisateurs et rôles

### 2.1 Rôles plateforme

| Rôle | Description |
| ---- | ----------- |
| `USER` | Compte standard (doctorant et/ou encadrant selon ses memberships). |
| `SUPER_ADMIN` | Accès à la console d’administration (`/admin`) : utilisateurs, invitations, audit, système, facturation. |

### 2.2 Rôles par thèse (`ThesisMembership`)

| Rôle | Description |
| ---- | ----------- |
| `DOCTORAL_STUDENT` | Propriétaire / auteur principal de la thèse (un doctorant = une thèse principale en V1). |
| `SUPERVISOR` | Encadrant rattaché à la thèse ; peut valider, remarquer, planifier, évaluer. |
| `ADMIN` | Rôle membre élargi sur une thèse (invitations / gouvernance locale), distinct du super-admin plateforme. |

### 2.3 Modèle d’accès

L’accès aux ressources d’une thèse est **centralisé** (`ThesisAccessService` / politique d’accès) :

- utilisateur **sans membership** → **404** (pas de fuite d’existence) ;
- membre avec **mauvais rôle** pour l’action → **403**.

L’authentification repose sur une **session cookie** (`tp_session`) + **CSRF** (`tp_csrf`) : pas de jeton JWT stocké dans `localStorage`.

---

## 3. Espaces fonctionnels

### 3.1 Espace doctorant

Navigation typique : Tableau de bord → Objectifs → Livrables → Remarques → Réunions → Ressources / Bibliothèque → Messagerie → Research Radar → Portfolio ; plus Profil, Paramètres, Abonnement, Mon encadrant.

| Module | Capacités principales |
| ------ | --------------------- |
| **Tableau de bord** | Identité académique, progression (%), échéances, activité récente, indicateurs (objectifs / livrables). |
| **Objectifs** | CRUD, filtres (tous / en cours / à venir / terminés / en retard), progression, tâches / étapes ; parcours doctoral standard applicable. |
| **Livrables** | Types (article, chapitre, rapport, code, dataset, présentation, etc.), versions, fichier, soumission à l’encadrant. |
| **Remarques** | Lecture et réponses ; cycle de statut (ouverte → en cours → corrigée → close) ; lien optionnel objectif / livrable. |
| **Réunions** | Demande de séance (sujet, ordre du jour) ; l’encadrant confirme date / modalité / lieu ou lien ; historique conservé. |
| **Ressources** | Consultation des contenus partagés par l’encadrant (cours, articles, documents). |
| **Messagerie** | Conversations directes (et groupes côté encadrant). |
| **Portfolio** | Publications, projets, compétences ; l’encadrant peut faire évoluer le statut des publications. |
| **Research Radar / Research AI** | Génération d’aide à la synthèse / veille liée à la thèse. |
| **Profil** | Identité, institution, labo, école doctorale, ORCID, CV, photo, liens académiques ; métadonnées de thèse. |

### 3.2 Espace encadrant

L’UI bascule en mode encadrant lorsqu’au moins une thèse est supervisée (ou qu’une invitation encadrant est en attente).

Navigation typique : Tableau de bord → Livrables (multi-doctorants) → Mes doctorants → Invitations → Réunions → **Suivi** → Ressources → Messagerie.

| Module | Capacités principales |
| ------ | --------------------- |
| **Tableau de bord** | Effectif, progression moyenne, objectifs en cours / en retard, livrables en attente ; file à valider ; recherche / filtres / tri. |
| **Mes doctorants** | Liste des thèses supervisées ; entrée vers le dossier de chaque doctorant (anneau de progression sur la photo). |
| **Dossier doctorant** | Sous-espace : tableau de bord, objectifs, livrables, remarques, réunions, profil académique. |
| **Livrables** | Validation, demande de modifications, remarques liées. |
| **Réunions** | Vue agrégée tous doctorants ; confirmer / refuser / planifier ; compte rendu ; historique. |
| **Suivi (`/suivi`)** | Centre de notifications, échéancier académique, rapports de progression, évaluations périodiques (notes 1–5), publications scientifiques, historique des décisions, plan de recherche. |
| **Ressources** | Bibliothèque partagée (ajout / modification / retrait) visible des doctorants rattachés. |

### 3.3 Administration & facturation

- **Admin** : utilisateurs, invitations, journal d’audit, état système, abonnements.
- **Billing** : essai, abonnements (plans Pro), paiements (simulation / provider mock en démo), factures PDF.

---

## 4. Architecture technique

### 4.1 Style architectural

**Monolithe modulaire** : un seul déploiement API NestJS, découpé en modules métier, sans microservices séparés à ce stade. Décision documentée dans `docs/architecture/decisions/0001-modular-monolith.md`.

```
Navigateur (apps/web)
        │  HTTP JSON /api/v1 + cookies same-origin
        ▼
API NestJS (apps/api) — controllers → services / politiques → Prisma
        ▼
PostgreSQL
Redis (health, rate limit / cache / files selon maturité)
Stockage objet S3-compatible (livrables, CV, avatars)
SMTP (e-mails transactionnels ; Mailpit en local)
```

### 4.2 Structure du monorepo

| Chemin | Rôle |
| ------ | ---- |
| `apps/api` | API NestJS, Prisma, scripts de seed / démo |
| `apps/web` | SPA React (Vite), routes françaises, i18n |
| `packages/types` | Types et constantes partagés (rôles, codes d’erreur) |
| `packages/validation` | Schémas Zod du contrat HTTP |
| `packages/ui` | Primitives d’interface |
| `packages/config` | Config TypeScript partagée |
| `infrastructure/` | Scripts d’env, Docker (nginx, S3 local), déploiement |
| `docs/` | Architecture, sécurité, fonctionnalités, démo client |

### 4.3 Stack

| Couche | Technologies |
| ------ | ------------ |
| Frontend | React, TypeScript strict, Vite, React Router, TanStack Query, React Hook Form, Zod, Tailwind CSS |
| Backend | NestJS, REST, OpenAPI (`/docs` hors production) |
| Données | PostgreSQL, Prisma |
| Infra | Redis, Docker Compose, stockage S3-compatible, GitHub Actions |
| Qualité | ESLint, Prettier, Jest (API), Vitest (web), Playwright (e2e) |

### 4.4 Flux d’une requête API

1. Corrélation (`x-request-id`)
2. Helmet, CORS (`APP_URL`), cookies, corps JSON limité
3. Rate limiting
4. Controller mince
5. Validation Zod si déclarée
6. Service + contrôle d’accès thèse si besoin
7. Prisma / stockage / e-mail

Préfixe public : **`/api/v1`**.

---

## 5. Données et domaines métier (aperçu)

Le schéma Prisma couvre notamment : utilisateurs et profils, sessions, thèses et memberships, invitations, objectifs et tâches, livrables et versions de fichiers, remarques, réunions, conversations / messages, ressources partagées et documents de thèse, portfolio, audit logs, essais / abonnements / paiements / factures, paramètres de facturation.

Les fichiers (PDF de livrables, CV, etc.) passent par un stockage objet avec URLs signées ; un mode d’analyse antivirus / scan (`FILE_SCAN_MODE`) peut laisser un fichier en `PENDING` tant qu’il n’est pas déclaré propre (impact sur le téléchargement / prévisualisation).

---

## 6. Sécurité (principes)

- Mots de passe hachés (**Argon2id**)
- Vérification d’e-mail avant certaines actions (création de thèse, etc.)
- Cookies de session HTTP-only + jeton CSRF
- Limitation des tentatives de connexion
- Audit append-only des actions sensibles
- Isolation stricte par membership de thèse
- Pas de secrets de production dans le dépôt (`.env` local dérivé de `.env.example`)

Détails : `docs/security/authentication.md`, `docs/security/foundation.md`.

---

## 7. Installation et exécution (développement)

**Prérequis** : Node.js ≥ 22, npm 11, Docker Desktop.

```bash
npm ci
cp .env.example .env          # ou Copy-Item sous Windows
npm run dev:infra             # postgres, redis, mailpit (+ profil mail)
npm run db:migrate
npm run db:seed:demo          # comptes et thèse de démonstration
npm run dev                   # API + web (packages partagés compilés d’abord)
```

| Service | URL typique |
| ------- | ----------- |
| Interface | http://localhost:5173 (ou 5174 si le port est pris) |
| API health | http://localhost:3000/api/v1/health |
| OpenAPI | http://localhost:3000/docs |
| Mailpit | http://localhost:8025 |
| Stack Docker (UI) | http://localhost:8080 |

Variables structurantes : `DATABASE_URL`, `REDIS_URL`, `APP_URL`, `API_PORT`, `SMTP_*`, `S3_*`, `TRUST_PROXY`, `NODE_ENV`, `LOG_LEVEL`.

---

## 8. Démonstration client

Deux comptes de base (données **fictives**) :

| Espace | Nom | E-mail | Mot de passe |
| ------ | --- | ------ | ------------ |
| Doctorant | Youssef El Amrani | `demo.doctorant@example.test` | `ThesisPartner2026!` |
| Encadrant | Pr. Karim El Mansouri | `demo.encadrant@example.test` | `ThesisPartner2026!` |

Commandes utiles :

```bash
npm run db:seed:demo
node apps/api/scripts/populate-supervisor-demo.mjs http://localhost:5174
# optionnel : enrichir le dossier Youssef
node apps/api/scripts/populate-demo-platform.mjs http://localhost:5174
```

Le script d’encadrement conserve Youssef et ajoute **huit doctorants marocains fictifs** (sujets en IA médicale, énergie solaire, darija, patrimoine, eau, IoT, gouvernance urbaine, mobilité) pour un total de **neuf thèses supervisées**, avec portraits, objectifs, livrables PDF, remarques, réunions, évaluations et messagerie.

Guide complet : [`docs/demo-client.md`](demo-client.md).

---

## 9. Qualité et CI

```bash
npm test                  # unitaires API + web
npm run test:integration  # API + PostgreSQL de test + Redis
npm run test:e2e          # Playwright
npm run lint
npm run typecheck
npm run build
```

La CI GitHub Actions enchaîne lint, types, tests d’intégration et e2e. Le déploiement production s’appuie sur Docker Compose / scripts sous `infrastructure/deploy/` (migrations `deploy`, pas de reset destructif).

---

## 10. Positionnement produit

Thesis Flow se positionne comme :

1. un **outil de travail doctoral** (jalons, versions, échanges structurés) ;
2. un **cockpit d’encadrement** multi-étudiants (validation, suivi, décisions tracées) ;
3. une base **SaaS** (comptes, essai, abonnement, admin) déployable en local ou sur VPS.

Ce n’est pas un LMS généraliste ni un éditeur de manuscrit : le cœur est la **coordination et la traçabilité du parcours de thèse**.

---

## 11. Documentation associée

| Document | Contenu |
| -------- | ------- |
| [`fonctionnalites.md`](fonctionnalites.md) | Inventaire UX doctorant / encadrant |
| [`demo-client.md`](demo-client.md) | Installation démo et cohorte client |
| [`architecture/overview.md`](architecture/overview.md) | Vue d’ensemble technique |
| [`architecture/database.md`](architecture/database.md) | Base de données et migrations |
| [`security/authentication.md`](security/authentication.md) | Auth, sessions, invitations |
| [`storage.md`](storage.md) | Fichiers, S3, scan |
| [`api/conventions.md`](api/conventions.md) | Conventions d’API |
| [`testing/strategy.md`](testing/strategy.md) | Stratégie de tests |

---

*Document généré pour décrire l’état fonctionnel et technique du dépôt Thesis Flow / Phd_companion_2026.*
