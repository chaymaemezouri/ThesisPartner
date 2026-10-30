# ADR 0001 — Monolithe modulaire

## Statut

Accepté

## Contexte

Thesis Flow doit couvrir le suivi d’une thèse pour plusieurs rôles, avec une isolation stricte entre thèses. Le produit est encore en construction et l’équipe qui le fait évoluer est réduite.

## Décision

L’API est un monolithe modulaire NestJS. Chaque domaine métier sera un module dans le même processus et la même base PostgreSQL. Nous ne découpons pas le système en microservices.

## Raisons

- L’application est encore en développement : les frontières métier vont bouger.
- L’équipe est réduite : plusieurs services multiplieraient le déploiement, l’observabilité et les contrats réseau.
- Les opérations qui touchent une thèse (objectif, livrable, remarque, journal) doivent pouvoir partager une transaction.
- Les tests d’intégration restent un seul processus, une base et Redis.
- Un module pourra être extrait plus tard si un besoin réel de mise à l’échelle ou d’isolation de charge apparaît. Cette extraction n’est pas anticipée par des services vides.

## Conséquences

- Un seul déploiement API, versionné sous `/api/v1`.
- Pas de communication réseau entre domaines.
- La discipline de module (controller mince, règle métier hors du transport HTTP) remplace la frontière réseau.
