# Démonstration client

Les deux comptes ci-dessous permettent de tester les espaces doctorant et encadrant. Le script `npm run db:seed:demo` crée ces comptes, confirme leurs adresses et les rattache à la même thèse avec leurs rôles respectifs.

| Espace    | Nom               | Email                         | Mot de passe         |
| --------- | ----------------- | ----------------------------- | -------------------- |
| Doctorant | Youssef El Amrani | `demo.doctorant@example.test` | `ThesisPartner2026!` |
| Encadrant | Nora Bernard      | `demo.encadrant@example.test` | `ThesisPartner2026!` |

Ces identifiants sont publics et réservés à une instance de démonstration avec des données fictives.

## Installer la démonstration

Prérequis : Node.js 22 ou supérieur, npm 11 et Docker Desktop démarré. Depuis la racine du dépôt :

```bash
npm ci
```

Copier `.env.example` vers `.env` si ce fichier n'existe pas encore (`Copy-Item .env.example .env` dans PowerShell, ou `cp .env.example .env` sous macOS/Linux). Vérifier que `DATABASE_URL` pointe vers la base de démonstration souhaitée.

```bash
docker compose up -d --wait postgres redis mailpit s3
npm run build:packages
npm run db:generate
npm run db:migrate
npm run db:seed:demo
npm run dev
```

Le seed ajoute la thèse de Youssef, ses objectifs, ses tâches, ses livrables et ses remarques. Il peut être relancé, mais il réinitialise les mots de passe de ces comptes et recrée les livrables et remarques de cette thèse : le lancer avant la recette, sur la base de démonstration.

Git transporte le script et les identifiants de test. La base PostgreSQL locale n'est pas transférée par un push : exécuter le seed sur chaque nouvelle instance de démonstration. Si les variables `DEMO_STUDENT_EMAIL`, `DEMO_SUPERVISOR_EMAIL` ou `DEMO_PASSWORD` sont définies dans l'environnement ou `.env`, elles remplacent les identifiants ci-dessus.

## Tester les deux espaces

Ouvrir l'adresse **Local** affichée par Vite dans le terminal. Le port habituel est `5173` ; si ce port est occupé, Vite en choisit un autre. Sur le poste de développement actuel, ThesisPartner est accessible à `http://localhost:5174`.

1. Se connecter avec le compte de Youssef et consulter le tableau de bord, les objectifs, les livrables et les remarques.
2. Se déconnecter, puis se connecter avec le compte de Nora pour consulter l'espace encadrant et le dossier de Youssef.
3. Pour comparer les deux rôles simultanément, utiliser deux profils de navigateur ou une fenêtre privée.

Les adresses en `localhost` fonctionnent sur la machine qui exécute le projet. Pour une recette à distance, l'instance doit être déployée sur une adresse accessible au client et sa base initialisée avec le même seed.
