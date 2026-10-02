# Sécurité — fondation

L’authentification complète arrive dans la phase suivante. Les choix qui seraient coûteux à revenir en arrière sont déjà fixés.

## Session

- Cookie `tp_session`, `HttpOnly`, `SameSite=Lax`, `Secure` en production, durée 14 jours.
- La valeur future sera un identifiant opaque. Son hash sera stocké dans `sessions.token_hash`, pas le secret en clair.
- `sessions` prévoit l’expiration (`expires_at`) et la révocation (`revoked_at`).
- Pas de JWT dans `localStorage`. Le client envoie `credentials: 'include'`.

## Mots de passe

Argon2id via `@node-rs/argon2` : 19 MiB de mémoire, 2 itérations, parallélisme 1. Le mot de passe doit faire entre 12 et 128 caractères. Le hash n’est pas journalisé.

## CSRF

Jeton HMAC lié à un secret de session. Le secret stocké en base est son empreinte SHA-256 (`sessions.csrf_secret_hash`). L’en-tête prévu est `x-csrf-token`. Le contrôle n’est pas encore appliqué aux routes, parce qu’aucune route authentifiée n’existe. Le health check resterait exempté.

## En-têtes et réseau

- Helmet
- CORS limité à `APP_URL`, avec cookies
- Rate limit en mémoire (100 requêtes / minute hors tests). Le store Redis viendra avec plusieurs instances.
- Corps JSON plafonné
- `TRUST_PROXY` uniquement derrière le proxy

## Journaux

Les événements sont du JSON sur la sortie standard : méthode, route sans query string, statut, durée, `requestId`. Les clés dont le nom évoque un mot de passe, un jeton, un cookie, un secret ou une session sont remplacées par `[redacted]`. Le corps des requêtes n’est pas journalisé.

## Isolation

Une thèse est un espace fermé. Connaître un identifiant ne donne aucun accès. La décision est dans `ThesisAccessPolicy`, pas recopiée dans chaque controller. Un administrateur sans membership n’entre pas : il n’y a pas de contournement implicite.

## Ce qui reste volontairement plus tard

Les modules métier (objectifs, livrables, remarques, réunions, veille, radar, portfolio) ne sont pas encore exposés. Le contrôle distribué du rate limit, pour plusieurs instances, non plus.
