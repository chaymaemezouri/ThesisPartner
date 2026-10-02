# Tests

## API — unitaires

Jest, sans base. Ils couvrent la configuration, la rédaction des secrets, le filtre d’erreurs, Argon2id, le cookie de session, le CSRF, la politique d’accès et le health check simulé.

`npm test` lance aussi Vitest sur le frontend.

## API — intégration

Jest + Supertest contre l’application réelle (`createApp`). PostgreSQL de test et Redis doivent être joignables.

Couverture minimale :

- `GET /api/v1/health` renvoie 200 et `status: ok`
- une requête SQL aboutit
- une route inconnue renvoie le contrat d’erreur et le `requestId`
- OpenAPI répond hors production
- un membre accède à sa thèse ; un autre utilisateur reçoit une erreur d’absence de ressource

La base de test est isolée de `DATABASE_URL`. Voir `docs/architecture/database.md`.

## Frontend

Vitest et Testing Library : shell, navigation, menu mobile, primitives, client HTTP, formulaire Zod. Le client vérifie qu’il n’écrit rien dans `localStorage`.

## Bout en bout

Playwright ouvre le shell Vite et parcourt la navigation desktop, le tiroir à 375 px, et l’absence de défilement horizontal à 1920, 1440, 1366, 1024, 768 et 375 px. Ces tests ne exigent pas que l’API soit démarrée : l’état « plateforme indisponible » reste un état valide du shell.

## CI

Le workflow `.github/workflows/ci.yml` démarre PostgreSQL et Redis, puis enchaîne intégration, lint, types, tests unitaires et builds. Playwright a son propre job.
