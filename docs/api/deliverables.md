# Livrables

Un livrable est une production académique rattachée à une thèse. Ce n’est pas un fichier. Une version est une révision enregistrée de ce livrable. Un fichier, quand il existe, est rattaché à une version et stocké hors de PostgreSQL. La revue encadrant arrive dans une phase suivante. Le détail du stockage est dans `docs/storage.md`.

## Modèle

`Deliverable` appartient toujours à une `Thesis`. `objectiveId` est facultatif : un poster, un rapport annuel ou une communication peuvent exister sans objectif. Un objectif peut avoir plusieurs livrables. La relation n’est pas many-to-many.

Champs : `id`, `thesisId`, `objectiveId` nullable, `title`, `description` nullable, `type`, `status`, `dueDate` nullable, `createdById`, `createdAt`, `updatedAt`.

Aucun `fileUrl`, `filePath` ou contenu binaire.

## Types

`ARTICLE`, `THESIS_CHAPTER`, `REPORT`, `CODE`, `DATASET`, `PRESENTATION`, `POSTER`, `COMMUNICATION`, `OTHER`.

Libellés : Article, Chapitre de thèse, Rapport, Code, Jeu de données, Présentation, Poster, Communication, Autre.

## Statuts

`DRAFT`, `SUBMITTED`, `CHANGES_REQUESTED`, `VALIDATED`, `CANCELLED`.

Libellés : Brouillon, Soumis, À corriger, Validé, Annulé.

Toute création est forcée à `DRAFT` par l’API. Les transitions de revue ne sont pas exposées. L’annulation d’un brouillon passe le statut à `CANCELLED`. Il n’y a pas de suppression.

## Retard

`isOverdue` est calculé. Il est vrai lorsque le jour d’échéance, en UTC, est antérieur à aujourd’hui et que le statut n’est ni `VALIDATED` ni `CANCELLED`. Le jour même n’est pas en retard. Le booléen n’est pas stocké.

## Tri

Par défaut (`sort=due`) :

1. livrables actifs (`DRAFT`, `SUBMITTED`, `CHANGES_REQUESTED`), échéance la plus proche d’abord, sans date en dernier ;
2. à échéance égale, `updatedAt` le plus récent ;
3. `VALIDATED`, du plus récemment modifié au plus ancien ;
4. `CANCELLED` en dernier.

`sort=updated` conserve ces trois groupes et trie chaque groupe par `updatedAt` décroissant. L’`id` départage les égalités.

## Permissions

L’accès commence par `ThesisMembership`. Une personne non membre, y compris un `ADMIN` non membre, reçoit 404.

Le doctorant membre peut lister, consulter, créer, modifier et annuler un brouillon, filtrer et associer un objectif de la même thèse. Il ne peut pas valider ni simuler une revue.

L’encadrant membre peut lister, consulter, rechercher et filtrer. Il ne peut pas créer, modifier, annuler, valider ou demander une correction.

`objectiveId` doit désigner un objectif de la même thèse. Sinon la réponse est 400.

## Endpoints

`GET /api/v1/theses/:thesisId/deliverables`

`POST /api/v1/theses/:thesisId/deliverables`

`GET /api/v1/theses/:thesisId/deliverables/:deliverableId`

`PATCH /api/v1/theses/:thesisId/deliverables/:deliverableId`

Pas de `DELETE`.

Filtres de liste : `status`, `type`, `objectiveId`, `search`, `sort`. `search` porte sur le titre et la description, sans tenir compte de la casse. Une valeur invalide répond 400.

La liste retourne l’identité, le type, le statut, l’échéance, `isOverdue`, l’objectif `{ id, title }`, l’auteur `{ id, givenName, familyName }`, `versionCount`, `latestVersionNumber` et les dates. Le détail ajoute la description et `versionsSummary` (`count`, `latestVersionNumber`, `latestVersionCreatedAt`). Les versions elles-mêmes passent par leur endpoint.

Le corps de création accepte `title`, `type`, `description`, `objectiveId`, `dueDate`. Le corps de modification accepte ces champs, ou `{ status: "CANCELLED" }` seul.

## Tableau de bord

`deliverables` compte `total`, `draft`, `submitted`, `changesRequested`, `validated`, `overdue`. `total` exclut `CANCELLED`. Les échéances ouvertes des livrables entrent dans la liste commune, triée par date et limitée à 8 éléments, avec les objectifs, les tâches et la soutenance.

Les événements d’audit `deliverable.created`, `deliverable.updated`, `deliverable.cancelled`, `deliverable.objective_linked`, `deliverable.version_created` et `deliverable.file_uploaded` alimentent l’activité lisible. Une nouvelle version s’affiche par une phrase du type : Nouvelle version V2 ajoutée à « Chapitre… ». Un fichier s’affiche par : Un fichier a été ajouté à la version V2 de « Chapitre… ». Le tableau de bord ne compte ni les versions ni les fichiers, et ne transporte pas leur contenu.

## Versions

`DeliverableVersion` appartient à un seul `Deliverable`. Le livrable reste l’identité stable. La version est un instantané ajouté à la suite : pas de modification, pas de suppression.

Champs : `id`, `deliverableId`, `versionNumber`, `title` nullable, `changeSummary` nullable, `createdById`, `createdAt`. Pas de `updatedAt`. Pas de `fileUrl`, `filePath` ni contenu binaire dans cette table. Le fichier principal, s’il existe, est une ligne `StoredFile`.

`versionNumber` commence à 1 pour chaque livrable, puis 2, 3… Le client ne l’envoie pas. Le serveur calcule `max + 1` dans une transaction qui verrouille le livrable. La contrainte unique `(deliverableId, versionNumber)` empêche deux V3. En cas de collision, la création est réessayée, puis répond 409 si elle échoue encore.

`changeSummary` est facultatif pour la version 1 et obligatoire ensuite, sur 1000 caractères. `title` reste facultatif et n’est pas recopié depuis le livrable.

Index : unique `(deliverableId, versionNumber)`, index `(deliverableId, createdAt)`. La suppression du livrable cascade les versions. `createdBy` est en `RESTRICT`.

Le doctorant membre peut ajouter une version tant que le livrable est `DRAFT`. L’encadrant membre peut lister et consulter. Une personne non membre reçoit 404. Une version demandée sous un autre livrable ou une autre thèse reçoit 404, même si son identifiant existe.

`GET /api/v1/theses/:thesisId/deliverables/:deliverableId/versions` retourne au plus 100 versions, `versionNumber` décroissant.

`POST` le même chemin accepte `{ changeSummary, title? }` et répond 201.

`GET .../versions/:versionId` retourne une version. Le champ `file` est `null` ou les métadonnées `{ id, originalName, mimeType, sizeBytes, createdAt, uploadedBy }`. La clé de stockage, le bucket et l’empreinte ne sortent pas.

Pas de `PATCH` ni de `DELETE` sur une version, ni sur son fichier.

L’audit `deliverable.version_created` conserve `deliverableId`, `versionId` et `versionNumber`.

## Fichier d’une version

`POST .../versions/:versionId/file` reçoit `multipart/form-data` et le champ `file`. Le doctorant membre peut l’appeler sur un brouillon. L’encadrant reçoit 403. Une personne non membre, y compris un administrateur non membre, reçoit 404. Une version qui a déjà un fichier répond `409 VERSION_FILE_ALREADY_EXISTS`.

`GET .../versions/:versionId/file/download` vérifie la session, l’appartenance et la cohérence des identifiants, puis renvoie `{ url, expiresAt }` pour une URL signée de quelques minutes. Sans fichier : 404. Le fichier n’est téléchargeable que si son contrôle est `CLEAN`.

Codes : `FILE_TOO_LARGE`, `FILE_TYPE_NOT_ALLOWED`, `FILE_SIGNATURE_MISMATCH`, `VERSION_FILE_ALREADY_EXISTS`, `FILE_SCAN_PENDING`, `FILE_INFECTED`.

L’audit `deliverable.file_uploaded` conserve `fileId`, `versionId`, `deliverableId`, `sizeBytes` et `mimeType`. Il ne conserve pas le nom d’origine.

La liste et le détail d’un livrable ne contiennent pas les octets du fichier.

## Phases suivantes

Revue encadrant : phase 4.4. `CHANGES_REQUESTED` pourra alors autoriser une nouvelle version. La soumission et la validation restent fermées.
