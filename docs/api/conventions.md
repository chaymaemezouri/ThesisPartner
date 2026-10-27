# Conventions HTTP

Toutes les routes applicatives sont sous `/api/v1`.

## Santé

`GET /api/v1/health`

```json
{
  "status": "ok",
  "checks": {
    "api": "ok",
    "database": "ok",
    "redis": "ok"
  }
}
```

`status` vaut `degraded` et le code HTTP passe à 503 si PostgreSQL ou Redis ne répond pas. La réponse ne contient ni chaîne de connexion, ni version interne exploitable comme secret.

## Erreurs

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Invalid request",
  "errors": [{ "field": "title", "message": "Required" }],
  "requestId": "…"
}
```

Codes : `VALIDATION_ERROR`, `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `PAYLOAD_TOO_LARGE`, `INTERNAL_ERROR`.

En production, une erreur interne renvoie `Internal server error`. La pile, le message Prisma et les secrets ne sortent pas dans le JSON.

## Corrélation

Chaque réponse porte `x-request-id`. Un identifiant entrant est conservé s’il matche `^[A-Za-z0-9_-]{8,64}$`. Sinon l’API en génère un.

## Validation

Un handler qui accepte un corps déclare `@ValidateBody(schema)`. Le schéma Zod est strict : les propriétés inconnues sont refusées. Les clés `__proto__`, `constructor` et `prototype` sont rejetées. Le corps JSON est limité à 256 Ko.

La validation du navigateur ne remplace pas celle de l’API.

## OpenAPI

`/docs` et `/docs-json` sont montés quand `NODE_ENV` n’est pas `production`.

## Super Admin

Les endpoints de pilotage (`/api/v1/admin/...`) sont documentés dans [admin.md](./admin.md). Ils exigent `platformRole = SUPER_ADMIN` et n’exposent ni fichiers scientifiques, ni secrets.

## Accès à une thèse

Les futurs endpoints de ressources prennent l’acteur authentifié, l’identifiant de thèse et les rôles autorisés, puis appellent `ThesisAccessService`. L’absence de membership est un 404. Un rôle insuffisant est un 403.
