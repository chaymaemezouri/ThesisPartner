# Stockage des fichiers

Un fichier appartient à une version de livrable. Le livrable, la version et le fichier restent trois objets distincts.

```
Deliverable
  └── DeliverableVersion
        └── StoredFile (0 ou 1)
              └── objet dans un bucket privé
```

Les versions créées avant cette phase peuvent rester sans fichier. Une version n’a jamais plus d’un fichier principal : `deliverableVersionId` est unique. Il n’existe pas d’endpoint pour remplacer ou supprimer ce fichier. Pour faire évoluer le travail, on crée une version suivante, puis on y attache un nouveau fichier.

## Abstraction

Le domaine des livrables parle à `ObjectStorage` :

- `putObject`
- `deleteObject`
- `objectExists`
- `createSignedDownloadUrl`
- `ensurePrivateBucket`

L’implémentation actuelle est `S3ObjectStorage`, un client S3 (`@aws-sdk/client-s3`) avec `forcePathStyle`. Les sommes de contrôle AWS ne sont envoyées que lorsqu’elles sont exigées, pour rester compatible avec les stockages S3 qui ne sont pas Amazon. Amazon S3, Cloudflare R2, Backblaze B2 ou MinIO se branchent en changeant l’endpoint et les identifiants, sans modifier `Deliverable`.

## Bucket privé

Le bucket n’est pas public. Aucune politique `public-read` n’est posée. Au démarrage, le bucket est créé s’il manque, et une politique qui autoriserait `s3:GetObject` pour tout le monde est retirée. Un `GET` anonyme sur l’objet répond 403.

L’API ne renvoie jamais la clé de stockage, le nom du bucket, le fournisseur ni l’empreinte. Le téléchargement passe par une URL signée de courte durée (`SIGNED_URL_TTL_SECONDS`, 300 secondes par défaut, entre 30 et 3600). L’objet est enregistré avec `Content-Disposition: attachment` et un nom nettoyé, et l’URL signée redemande le même en-tête. Cela couvre les serveurs S3 qui ignorent le paramètre de réponse.

## Clé de stockage

La clé est produite uniquement par le serveur :

`theses/{thesisId}/deliverables/{deliverableId}/versions/{versionId}/{uuid}`

`originalName` sert à l’affichage et à l’en-tête de téléchargement. Un nom comme `../../secret.pdf` devient `secret.pdf` et ne change pas la clé.

## Envoi

`POST /api/v1/theses/:thesisId/deliverables/:deliverableId/versions/:versionId/file`

`multipart/form-data`, champ `file`. Session, jeton CSRF, membre doctorant, livrable en brouillon. Un fichier déjà présent répond `409 VERSION_FILE_ALREADY_EXISTS`.

Le fichier est écrit dans un fichier temporaire (multer, disque), pas dans un blob PostgreSQL. Le serveur relit la taille réelle, les premiers octets, puis calcule le SHA-256 en flux. L’envoi vers le stockage est aussi un flux. Node ne garde pas le document entier en mémoire pour la taille maximale de la V1.

`MAX_UPLOAD_SIZE_MB` (50 par défaut) est la limite du serveur. Le navigateur affiche la même limite pour aider, sans en être la source.

Les envois ont leur propre plafond Redis, `UPLOAD_RATE_LIMIT_MAX` / `UPLOAD_RATE_LIMIT_TTL_MS` (20 par minute par défaut). Si Redis ne répond pas, l’envoi est refusé.

## Types acceptés

| Extension | Type MIME canonique                                                       | Signature  |
| --------- | ------------------------------------------------------------------------- | ---------- |
| pdf       | application/pdf                                                           | `%PDF`     |
| doc       | application/msword                                                        | OLE        |
| docx      | application/vnd.openxmlformats-officedocument.wordprocessingml.document   | ZIP        |
| ppt       | application/vnd.ms-powerpoint                                             | OLE        |
| pptx      | application/vnd.openxmlformats-officedocument.presentationml.presentation | ZIP        |
| xls       | application/vnd.ms-excel                                                  | OLE        |
| xlsx      | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet         | ZIP        |
| txt       | text/plain                                                                | texte      |
| csv       | text/csv                                                                  | texte      |
| zip       | application/zip                                                           | ZIP        |
| json      | application/json                                                          | JSON texte |

L’extension, le type déclaré et la signature doivent concorder. `application/octet-stream` est accepté seulement si l’extension et la signature sont reconnues. HTML, JavaScript, EXE, BAT, CMD, PS1, APK, DLL, SH, MSI et les types dangereux sont refusés. Un exécutable renommé `.pdf` répond `FILE_SIGNATURE_MISMATCH`. Un type hors liste répond `FILE_TYPE_NOT_ALLOWED`. Un fichier trop grand répond `FILE_TOO_LARGE`.

## Contrôle antivirus

`scanStatus` vaut `PENDING`, `CLEAN`, `INFECTED` ou `FAILED`.

L’adaptateur actuel est un stub explicite (`FILE_SCAN_MODE=stub`) :

- la chaîne EICAR dans l’en-tête marque `INFECTED` et le fichier n’est pas stocké ;
- hors production, le reste est `CLEAN` ;
- en production, le stub ne marque jamais `CLEAN` : le statut reste `PENDING`.

Le téléchargement n’est autorisé que pour `CLEAN`. `INFECTED` répond `FILE_INFECTED`. `PENDING` répond `FILE_SCAN_PENDING`. ClamAV pourra remplacer le stub plus tard, derrière le même statut, sans changer le livrable.

## Compensation

L’objet est envoyé, puis la ligne `StoredFile` et l’audit sont écrits dans une transaction. Si l’insertion échoue, l’objet est supprimé. Un échec de ce nettoyage est journalisé (`upload.cleanup_failed`) sans l’URL ni la clé dans un message destiné au client. La base ne doit pas référencer un objet absent : on n’écrit la ligne qu’après un envoi réussi.

## Journaux

`upload.started`, `upload.completed`, `upload.failed` portent l’identifiant de thèse, de version, la taille et le type. Ils n’emportent pas le contenu, l’URL signée, le cookie, la session, le secret de stockage ni le texte du document. Les clés `signedUrl`, `storageKey` et `checksum` sont masquées si elles apparaissent dans un objet journalisé.

## Quota

Aucun compteur facturable n’est stocké. La somme des `sizeBytes` d’une thèse se calcule par agrégat sur `StoredFile` via la version et le livrable. Une organisation future pourra sommer les thèses qu’elle possède.

## Stockage local

L’édition communautaire de MinIO ne publie plus d’image Docker ni de binaire (dépôt Docker Hub introuvable, `dl.min.io` répond 410). Le Compose lance donc SeaweedFS 4.00, un serveur S3 compatible, sur le port hôte 9000. Le volume est `s3_data`. Le fichier `infrastructure/docker/s3/s3.json` donne les identifiants locaux et n’ouvre aucun accès anonyme. Au démarrage, l’API crée le bucket `thesispartner` s’il manque et retire une politique de lecture publique. PostgreSQL, Redis et Mailpit restent inchangés.

L’API lancée sur l’hôte (`npm run dev`) signe les URL avec `S3_ENDPOINT=http://127.0.0.1:9000`, joignable par le navigateur. L’API du Compose pointe vers `http://s3:8333` et tourne en `NODE_ENV=production` : le stub y laisse les fichiers `PENDING`, donc non téléchargeables, jusqu’à un vrai scanner. Un MinIO, un bucket R2 ou S3 de production se branche par les mêmes variables.

## Suite

Limites plus hautes, envoi multipart et dépôt direct vers le stockage pourront s’ajouter sur `ObjectStorage` sans réécrire le livrable. La revue encadrant n’est pas dans cette phase.
