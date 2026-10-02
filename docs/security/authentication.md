# Authentification

Les comptes, les sessions et l’appartenance à une thèse sont en place. Les modules de suivi (objectifs, livrables, etc.) ne le sont pas.

## Session

`POST /api/v1/auth/register` et `POST /api/v1/auth/login` posent deux cookies :

- `tp_session` : identifiant opaque, `HttpOnly`, `SameSite=Lax`, `Secure` en production, 14 jours. Seul son empreinte SHA-256 est stockée.
- `tp_csrf` : jeton lisible par le navigateur, mêmes attributs sauf `HttpOnly`. Les requêtes `POST`, `PATCH` et `DELETE` authentifiées doivent renvoyer cette valeur dans `x-csrf-token`.

`POST /api/v1/auth/logout` révoque la session. Un mot de passe réinitialisé révoque toutes les sessions du compte. Un compte désactivé ne peut plus ouvrir de session.

Le client envoie `credentials: 'include'`. Rien n’est écrit dans `localStorage`.

## Mots de passe et tentatives

Argon2id, 12 à 128 caractères. Huit échecs de connexion pour une même adresse, pendant 15 minutes, répondent `429`. Ce compteur est en mémoire, sur une instance. Une adresse inconnue et un mot de passe incorrect produisent le même message.

L’inscription répond `409` si l’adresse existe déjà. La demande de réinitialisation répond toujours `200`, que le compte existe ou non.

## E-mail

La confirmation et la réinitialisation passent par un jeton à usage unique, stocké sous forme d’empreinte (`auth_tokens`). La confirmation expire après 24 heures, la réinitialisation après une heure.

`SMTP_HOST` envoie le message (Mailpit dans Docker Compose). Sans hôte SMTP, le développement écrit le message sur la sortie standard pour que le lien reste utilisable. En production, l’envoi échoue si `SMTP_HOST` est absent ; le compte déjà créé n’est pas annulé, et le lien peut être redemandé.

## Thèses

`POST /api/v1/theses` crée une thèse et le membership `DOCTORAL_STUDENT` de l’auteur. `GET /api/v1/theses/:id` répond `404` pour qui n’est pas membre. Un doctorant peut inviter un encadrant déjà inscrit. Un encadrant ou un administrateur membre peut inviter les trois rôles. L’invitation d’un rôle non permis répond `403`.
