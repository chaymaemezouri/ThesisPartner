# Architecture

Thesis Flow est un monolithe modulaire. Un seul déploiement sert l’API. Les domaines métier deviendront des modules NestJS quand ils seront construits, sans être des services séparés.

```
apps/web
  routes, layouts, pages, api client, schémas de formulaires
        │  HTTP JSON /api/v1, cookie de session plus tard
        ▼
apps/api
  controllers minces
        │
        ▼
  services / politiques (validation, accès à la thèse)
        │
        ▼
  Prisma
        │
        ▼
  PostgreSQL

Redis est connecté au démarrage et interrogé par le health check.
Il accueillera ensuite le rate limiting distribué, le cache et les files.
```

## Frontend

`apps/web` est une application Vite. TanStack Query détient l’état serveur. Il n’y a pas de store global pour les données de thèse. Les appels HTTP passent par `src/api/client.ts` : le navigateur envoie les cookies (`credentials: 'include'`) et ne stocke pas de jeton dans `localStorage`.

Les primitives visuelles vivent dans `packages/ui` et sont consommées par le shell. Les pages métier sont des emplacements vides, reliés à la navigation.

## API

Préfixe `/api/v1`. En développement et en test, OpenAPI est publié sur `/docs`.

Le flux d’une requête :

1. identifiant de corrélation (`x-request-id`) ;
2. Helmet, CORS limité à `APP_URL`, cookie parser, corps JSON plafonné à 256 Ko ;
3. rate limit ;
4. controller ;
5. intercepteur Zod lorsque le handler déclare un schéma ;
6. service et, pour les ressources de thèse, `ThesisAccessService` ;
7. Prisma.

Les controllers ne portent pas la règle « cet utilisateur appartient-il à cette thèse ? ». Cette règle est centralisée. Un utilisateur sans membership reçoit 404, y compris un compte `ADMIN` : l’appartenance est obligatoire. Un membre dont le rôle n’est pas autorisé reçoit 403.

## Données

Les tables de cette phase sont `users`, `profiles`, `theses`, `thesis_memberships`, `sessions` et `audit_logs`. Les identifiants sont des UUID. Les journaux d’audit sont append-only.

Les modules suivants restent à ajouter, chacun dans son propre module NestJS, sans créer de fichiers vides à l’avance :

`auth`, `users`, `profiles`, `theses`, `memberships`, `objectives`, `tasks`, `deliverables`, `remarks`, `recommendations`, `meetings`, `files`, `notifications`, `scientific-watch`, `research-radar`, `portfolio`, `progress`, `audit`, `ai-assistant`.

## Redis

Le client ioredis est créé au démarrage. S’il est injoignable, l’API continue de répondre et `/api/v1/health` renvoie `degraded` avec le check `redis: error`. Aucun secret n’est inclus dans cette réponse.

## Packages partagés

- `@thesispartner/types` : rôles, contrat d’erreur, health check, noms d’en-têtes
- `@thesispartner/validation` : schémas Zod du contrat HTTP
- `@thesispartner/ui` : primitives d’interface
- `@thesispartner/config` : options TypeScript communes au backend et aux packages compilés
