# API Super Admin

Toutes les routes ci-dessous exigent une session authentifiée avec `platformRole = SUPER_ADMIN` (`SuperAdminGuard`). Un utilisateur standard reçoit `403 FORBIDDEN`.

Préfixe : `/api/v1/admin`

Aucun endpoint n’expose de fichiers scientifiques, de jetons, de secrets d’environnement ni de contenu de livrables/messages.

## Tableau de bord

### `GET /stats`

Compteurs plateforme et série d’inscriptions (30 jours) + santé API.

Champs principaux : `totalUsers`, `activeAccounts`, `suspendedAccounts`, `doctoralStudents`, `supervisors` (distincts via `ThesisMembership`), `theses`, `activeTheses`, compteurs d’invitations par statut, fenêtres d’inscriptions (`7j` / `30j` / `12 mois`), `registrationsByDay`, `health`.

## Statistiques

### `GET /analytics`

Tendances réelles uniquement :

- `registrationsByDay` (90 jours), `registrationsByMonth` (12 mois)
- `activityByDay` (événements d’audit plateforme sélectionnés)
- `thesesWithoutSupervisor`, `pendingInvitationsOlderThan7Days`, `expiredInvitations`
- `activeSessions`, `loginsLast30Days`, `supervisorChangesLast30Days`

## Journal d’audit

### `GET /audit`

Query : `search`, `action`, `entityType`, `from`, `to` (ISO datetime), `page`, `pageSize` (max 100).

Réponse paginée : `entries[]` avec acteur (e-mail / nom), thèse (titre), métadonnées **sanitisées** (jetons / secrets retirés).

### `GET /audit/:entryId`

Détail d’une entrée (`404` si absente).

## Surveillance technique

### `GET /system`

Santé API/DB/Redis, `nodeEnv`, sessions actives, événements d’audit 24 h, échecs de connexion 24 h (`auth.login_failed`), invitations en attente. Pas de variables d’environnement.

## Utilisateurs et relations (phases 1–2)

- `GET /users`, `GET /users/:userId`
- `POST /users/:userId/suspend`, `POST /users/:userId/reactivate`
- `GET /invitations`
- `GET /theses/:thesisId/relations`
