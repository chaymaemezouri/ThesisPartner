# Démonstration client

Les deux comptes ci-dessous permettent de tester les espaces doctorant et encadrant. Le script `npm run db:seed:demo` crée ces comptes, confirme leurs adresses et les rattache à la même thèse avec leurs rôles respectifs.

| Espace    | Nom               | Email                         | Mot de passe         |
| --------- | ----------------- | ----------------------------- | -------------------- |
| Doctorant | Youssef El Amrani | `demo.doctorant@example.test` | `ThesisPartner2026!` |
| Encadrant | Karim El Mansouri | `demo.encadrant@example.test` | `ThesisPartner2026!` |

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

## Créer ou rétablir les accès sur un VPS avec Docker

La base du site déployé est distincte de la base locale. Depuis le répertoire du projet sur le VPS, récupérer cette version du dépôt puis envoyer le script au conteneur API existant :

```bash
git pull --ff-only origin main
docker compose exec -T api node --input-type=module < apps/api/scripts/ensure-demo-accounts.mjs
```

Cette méthode fonctionne sans reconstruire l'image. Si le déploiement utilise un fichier Compose personnalisé, ajouter les mêmes options `-f` et `-p` que pour son démarrage, et utiliser le nom de son service API. Les migrations doivent avoir été appliquées avant cette commande.

Cette commande utilise uniquement les dépendances présentes dans l'image de production. Elle crée les deux comptes s'ils sont absents, rétablit leurs mots de passe, confirme leurs emails et rattache Karim comme encadrant à la thèse de Youssef. Elle crée une thèse vide si Youssef n'en a pas encore. Les objectifs, tâches, livrables et remarques existants sont conservés. Les sessions des deux comptes sont fermées ; reconnecter ensuite les utilisateurs.

Les variables `DEMO_STUDENT_EMAIL`, `DEMO_SUPERVISOR_EMAIL` et `DEMO_PASSWORD` du conteneur peuvent remplacer les identifiants par défaut. Pour exécuter cette même opération hors Docker avec le `.env` racine, utiliser `npm run db:demo:accounts`.

## Tester les deux espaces

### Espace encadrant et cohorte de sept doctorants

Le compte encadrant représente **Pr. Karim El Mansouri**, professeur marocain en intelligence artificielle. Son email reste `demo.encadrant@example.test` et son mot de passe `ThesisPartner2026!`.

Pour compléter l'espace encadrant d'une instance où les deux comptes principaux existent :

```bash
node apps/api/scripts/populate-supervisor-demo.mjs https://thesis.academyskills.net
```

Ce script conserve le dossier de Youssef et ajoute six doctorants fictifs. Il remplit le profil et le portfolio de Karim, les dossiers scientifiques, les livrables, les réunions, les évaluations, les statuts de publication, les décisions, les échanges et la bibliothèque du groupe. Les sept rubriques du suivi encadrant sont vérifiées en fin d'exécution : notifications, planning, rapports, évaluations, publications, décisions et plan de travail.

| Doctorant         | Email                           | Sujet de démonstration                |
| ----------------- | ------------------------------- | ------------------------------------- |
| Youssef El Amrani | `demo.doctorant@example.test`   | Anomalies des réseaux électriques     |
| Amina Benjelloun  | `amina.benjelloun@example.test` | Intelligence artificielle médicale    |
| Yassine El Fassi  | `yassine.elfassi@example.test`  | Prévision solaire à Fès               |
| Salma Cherkaoui   | `salma.cherkaoui@example.test`  | Traitement de la darija               |
| Omar Idrissi      | `omar.idrissi@example.test`     | Patrimoine architectural de Marrakech |
| Imane Berrada     | `imane.berrada@example.test`    | Gestion intelligente de l'eau         |
| Hamza Tazi        | `hamza.tazi@example.test`       | Cybersécurité des objets connectés    |

Tous ces comptes fictifs utilisent le même mot de passe de démonstration, sauf surcharge par `DEMO_PASSWORD`. Chaque nouveau doctorant possède sa propre thèse, ses objectifs adaptés au sujet, trois livrables, un CV, un portfolio, des remarques, des réunions et un échange avec Karim. Les niveaux d'avancement et les échéances varient pour montrer des situations régulières et des retards. Aucun résultat de recherche ni publication réelle n'est revendiqué.

Le script est destiné à une instance de démonstration. Dans ces six dossiers fictifs, il remplace uniquement les objectifs standard encore vierges par un parcours adapté au sujet. Il réutilise les comptes, thèses et éléments déjà présents portant les mêmes identifiants ou titres ; il ne réinitialise pas les mots de passe d'un compte existant.

### Dossier détaillé de Youssef

Pour enrichir une instance déjà accessible avec des données fictives via son API (les deux comptes doivent pouvoir se connecter) :

```bash
node apps/api/scripts/populate-demo-platform.mjs https://thesis.academyskills.net
```

Le script remplit les huit objectifs et leurs tâches, fait valider les quatre premières étapes par le compte encadrant, crée six livrables avec des PDF, des remarques et réponses, cinq réunions, un portfolio, une bibliothèque pédagogique, deux évaluations et une conversation fictive entre les deux comptes. Il suit les transitions normales de l'application et évite les doublons par titre. Les contenus et résultats scientifiques sont explicitement fictifs. Les mots de passe restent `ThesisPartner2026!`, sauf si `DEMO_PASSWORD` est défini. Le paramètre facultatif `DEMO_REFERENCE_DATE` (`AAAA-MM-JJ`) fixe la date de référence du calendrier.

Les opérations sont effectuées au fil de l'exécution : en cas d'interruption, relancer le script pour terminer le remplissage. Les quatre objectifs déjà approuvés sont conservés, et les tâches déjà terminées ne sont pas remises à zéro. Ce script est réservé aux comptes de démonstration ; le lancer avant la recette client.

Le script ajoute aussi un CV fictif à chaque compte s'il est absent. Sur une instance de production utilisant l'analyse de fichiers `stub`, les pièces jointes des livrables restent `PENDING` : leur dépôt fonctionne, mais leur téléchargement répond `FILE_SCAN_PENDING`. Le remplissage des comptes ne change pas ce contrôle. Configurer un véritable traitement d'analyse sur le serveur pour rendre ces téléchargements disponibles ; voir [Stockage et analyse des fichiers](storage.md).

Ouvrir l'adresse **Local** affichée par Vite dans le terminal. Le port habituel est `5173` ; si ce port est occupé, Vite en choisit un autre. Sur le poste de développement actuel, Thesis Flow est accessible à `http://localhost:5174`.

1. Se connecter avec le compte de Youssef et consulter le tableau de bord, les objectifs, les livrables et les remarques.
2. Se déconnecter, puis se connecter avec le compte de Karim pour consulter l'espace encadrant et le dossier de Youssef.
3. Pour comparer les deux rôles simultanément, utiliser deux profils de navigateur ou une fenêtre privée.

Les adresses en `localhost` fonctionnent sur la machine qui exécute le projet. Pour une recette à distance, l'instance doit être déployée sur une adresse accessible au client et sa base initialisée avec le même seed.
