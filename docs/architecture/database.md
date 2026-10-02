# Base de données

PostgreSQL 16. Le schéma Prisma est `apps/api/prisma/schema.prisma`. Les migrations commises sont la source de vérité. `prisma db push` n’est pas une stratégie de déploiement.

## Développement

```bash
npm run db:migrate:dev
```

Prisma demande un nom de migration, écrit le SQL dans `apps/api/prisma/migrations`, puis l’applique sur `DATABASE_URL`.

## Appliquer les migrations existantes

```bash
npm run db:migrate
```

C’est aussi ce que le conteneur API exécute au démarrage.

## Recréer la base de développement

```bash
npm run db:reset
```

Cette commande efface les données de la base pointée par `DATABASE_URL`. Elle ne doit pas être utilisée en production.

## Production

1. Construire l’image ou le répertoire `dist`.
2. Fournir `DATABASE_URL` par l’environnement, jamais dans l’image.
3. Exécuter `prisma migrate deploy` une fois par déploiement, avant ou au démarrage d’une seule instance.
4. Démarrer `node apps/api/dist/main.js`.

Ne pas lancer `migrate dev` ni `db push` contre la base de production.

## Tests

`TEST_DATABASE_URL` désigne une autre base sur le même serveur, `thesispartner_test`. `npm run test:integration` la crée si elle manque, y applique les migrations, puis force `DATABASE_URL` des tests sur cette URL. Les tests qui écrivent nettoient leurs lignes. Ils ne dépendent pas de l’ordre d’exécution au-delà d’un worker unique.

## Seed

Les migrations ne chargent pas de données. Un seed de démonstration **opt-in** existe pour un tableau de bord doctorant (~52 % d’avancement, objectifs du parcours standard, livrables, remarques) :

```bash
npm run db:seed:demo
```

Comptes par défaut : `demo.doctorant@example.test` / `demo.encadrant@example.test`, mot de passe `ThesisPartner2026!` (surchargeables via `DEMO_STUDENT_EMAIL`, `DEMO_SUPERVISOR_EMAIL`, `DEMO_PASSWORD`).
