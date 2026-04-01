# Analyse Application Build In Peace

Date: 2026-03-24
Contexte: memoire de travail creee pendant une analyse complete du depot pour garder une trace persistante de l'architecture, des flux et des points sensibles.

## 1. Resume rapide

- Application React 18 creee avec Create React App.
- UI principalement en Tailwind utilitaire + quelques styles CSS.
- Backend entierement centre sur Firebase:
  - Auth Google
  - Firestore
  - Storage
  - Analytics
  - Cloud Messaging
- Domaine metier: gestion de chantiers, documents, taches, participants, messagerie, plans annotables, profil et reseau d'amis.

## 2. Entrees principales

- `src/index.js`: bootstrap React classique.
- `src/App.js`: routage principal.

## 3. Routage actuel

- `/` -> `Home`
- `/login` -> `Login`
- `/dashboard` -> `Dashboard`
- Sous-routes dashboard:
  - `/dashboard/chat` -> `Chat`
  - `/dashboard/todo` -> `ToDoList`
  - `/dashboard/documents` -> `FileManager`
  - `/dashboard/amis` -> `Amis`
  - `/dashboard/profil` -> `Profil`
  - `/dashboard/chantiers/:chantierId/conversations` -> `Conversations`
  - `/dashboard/chantiers/:chantierId/acteurs` -> `Acteurs`
  - `/dashboard/chantiers/:chantierId/documents` -> `Documents`

Observation importante:
- Le vrai flux chantier passe surtout par `Dashboard` -> `Chantier`, qui gere son propre etat local au lieu d'utiliser pleinement les sous-routes React Router.
- `Conversations.js` est un placeholder et semble depasse par `Acteurs.js`.

## 4. Parcours utilisateur

### Accueil / Auth

- `Home` affiche une landing tres simple avec `Navbar` et `BuildInPeace`.
- `Login` fait un `signInWithPopup` Google.
- Apres connexion:
  - creation du document utilisateur si absent dans `Utilisateurs/{uid}`
  - redirection vers `/dashboard/chantiers`

### Dashboard

- `Dashboard` contient la navigation principale.
- Si l'URL contient `/dashboard/chantiers`, il injecte le module `Chantier`.
- La sidebar est responsive, mais une partie de l'UX est codee en dur et non branchee.

### Gestion des chantiers

- `Chantier.js` est le centre metier de l'application.
- Capacites:
  - lister les chantiers visibles pour l'utilisateur connecte
  - creer un chantier
  - selectionner un chantier
  - inviter des intervenants
  - modifier/supprimer des participants
  - filtrer les menus selon le role
  - afficher les modules metier du chantier:
    - Administratif
    - Documents
    - Plan
    - Taches
    - Acteurs

### Administratif chantier

Modules separes:
- `Offres.js`
- `Factures.js`
- `Contrat.js`
- `Avancement.js`
- `Assurance.js`

Pattern commun:
- upload de PDF ou fichier sur Firebase Storage
- metadonnees sauvegardees dans une sous-collection Firestore du chantier
- liste, ajout, suppression

### Documents chantier

- `Documents.js` gere une arborescence de categories/sous-categories codee en dur.
- Les fichiers sont stockes dans Storage.
- Les metadonnees sont stockees dans une structure Firestore profondement imbriquee sous `chantiers/{chantierId}/categories/...`.

### Plan annotable

- `Plan.js` permet:
  - upload d'images/plan dans Storage
  - selection d'un plan
  - annotation avec Konva
  - dessin libre, rectangle, cercle, fleche, texte
  - sauvegarde de versions uniquement en memoire React

Point cle:
- les versions annotees ne sont pas persistees en Firestore ou Storage, seulement dans le state local de la session.

### Taches chantier

- `Todo.js` gere les taches d'un chantier:
  - sections
  - creation multi-etapes
  - responsables
  - taches terminees / archivees
  - details d'une tache

### Taches personnelles

- `ToDoList.js` gere:
  - taches personnelles utilisateur
  - taches assignees provenant des chantiers
  - commentaires

### Amis et messagerie privee

- `Amis.js` gere:
  - invitations entre utilisateurs
  - acceptation/refus
  - creation de conversation privee
  - chat texte/fichier/audio/image
  - visualisation du profil d'un ami

### Acteurs et messagerie chantier

- `Acteurs.js` gere:
  - recuperation des participants du chantier
  - conversation generale
  - conversations privees entre participants
  - fichiers, images, audio
  - consultation du profil d'un membre

### Profil

- `Profil.js` stocke un profil etendu sous:
  - `Utilisateurs/{uid}/Profiles/profileData`

### File manager utilisateur

- `FileManager.js` gere des repertoires personnels utilisateur et des documents associes.

## 5. Schema Firestore observe

### Utilisateurs

- `Utilisateurs/{uid}`
  - `displayName`
  - `email`
  - `uid`
  - eventuellement `sections`
- `Utilisateurs/{uid}/Profiles/profileData`
- `Utilisateurs/{uid}/amis/{friendUid}`
- `Utilisateurs/{uid}/tasks/{taskId}`
- `Utilisateurs/{uid}/directories/{directoryId}`
- `Utilisateurs/{uid}/directories/{directoryId}/documents/{docId}`

### Chantiers

- `chantiers/{chantierId}`
  - `name`
  - `client`
  - `gestionnaire`
  - `startDate`
  - `endDate`
  - `participants` (array)
  - `sections` (array)
  - parfois `planUrls`
- `chantiers/{chantierId}/participants/{participantDoc}`
- `chantiers/{chantierId}/todos/{todoId}`
- `chantiers/{chantierId}/conversations/{conversationId}`
- `chantiers/{chantierId}/conversations/{conversationId}/messages/{messageId}`
- `chantiers/{chantierId}/conversations/{conversationId}/files/{fileId}`
- `chantiers/{chantierId}/Offres/{docId}`
- `chantiers/{chantierId}/Factures/{docId}`
- `chantiers/{chantierId}/Contrat/{docId}`
- `chantiers/{chantierId}/Avancement/{docId}`
- `chantiers/{chantierId}/Assurances/{docId}`
- `chantiers/{chantierId}/categories/{category}/subCategories/{subCategory}/documents/{docId}`

### Conversations privees globales

- `conversations/{conversationId}`
- `conversations/{conversationId}/messages/{messageId}`

## 6. Schema Storage observe

- `documents/{uid}/{fileName}`
- `plans/{chantierId}/{fileName}`
- `conversations/{conversationId}/{fileName}`
- chemins admin variables:
  - `.../offres/...`
  - `.../factures/...`
  - `.../contrat/...`
  - `.../avancement/...`
  - `.../assurances/...`
  - documents chantier imbriques

## 7. Forces actuelles

- Le perimetre fonctionnel est deja large.
- Firebase est utilise de maniere coherente sur la majorite des flux.
- Les vues principales sont responsives.
- La logique metier chantier est deja bien decoupee par modules.
- Le build production passe actuellement.

## 8. Risques et incoherences majeurs

### Architecture

- `Chantier.js` concentre enormement de responsabilites.
- Une partie du routage existe mais le vrai pilotage se fait par etat local.
- Plusieurs composants sont presents mais peu ou pas integres:
  - `ChatSubject`
  - `Subjects`
  - `ChantierSubMenu`
  - `Auteurs.js` vide
  - `Conversations.js` placeholder

### Donnees

- Le modele Firestore est heterogene:
  - participants parfois dans un array du document chantier
  - parfois dans une sous-collection `participants`
- `inviteIntervenant` ecrit a la fois via `addDoc` dans la sous-collection et `updateDoc` sur l'array `participants`, avec risque de doublons et divergence.
- Les conversations utilisent `where('participants', '==', participantIds)`, ce qui depend d'un ordre strict de tableau et reste fragile.
- `ToDoList.js` accumule potentiellement des listeners imbriques sur tous les chantiers sans nettoyage fin par chantier.

### UX / logique

- `Plan.js`: les versions annotees sont perdues au rechargement.
- `Todo.js`: la photo d'une tache est gardee en `URL.createObjectURL`, pas persistee dans Storage.
- `Documents.js`: categories codees en dur, donc peu extensible.
- `Dashboard.js`: notifications declarees mais non utilisees.
- `Conversations.js` n'apporte pas de vraie valeur fonctionnelle.

### Qualite de code

- Beaucoup de `console.log`, code mort et imports inutilises.
- Plusieurs `useEffect` ont des dependances manquantes.
- Encodage texte abime a plusieurs endroits (`A`, `TAches`, etc.), signe probable de fichiers sauves avec un mauvais encodage.

### Dependances / socle technique

- Le projet repose sur Create React App, qui est maintenant obsolete.
- Le build remonte un avertissement Babel lie a CRA non maintenu.
- `.env.local` est present dans le workspace; verifier s'il est ignore et non committe avant partage.

## 9. Verification effectuee

Commande executee:
- `npm.cmd run build`

Resultat:
- build production OK
- compilation avec warnings ESLint seulement

Constats build:
- bundle principal assez lourd: environ 333 kB gzip
- nombreux warnings `no-unused-vars` et `react-hooks/exhaustive-deps`
- warning CRA/Babel de maintenance

## 10. Migration Firebase -> Supabase

### Objectif

Remplacer Firebase par Supabase tout en conservant les exemples existants, c'est-a-dire:
- conserver les parcours fonctionnels actuels
- conserver la logique metier visible dans l'interface
- conserver autant que possible la structure de donnees utile
- garder une memoire claire de l'avancement dans ce fichier

### Faisabilite

Oui, la migration est faisable, mais ce n'est pas un simple remplacement de SDK.

Firebase utilise dans le projet:
- Auth Google
- Firestore temps reel
- Storage
- Analytics
- Cloud Messaging

Equivalents Supabase:
- Auth Google -> Supabase Auth OK
- Firestore -> Postgres + Realtime + RPC/Views
- Storage -> Supabase Storage OK
- Analytics -> pas d'equivalent direct natif
- Cloud Messaging -> hors perimetre Supabase natif, a repenser

Conclusion:
- la migration du coeur applicatif est faisable
- `Analytics` et surtout `Cloud Messaging` devront etre remplaces ou supprimes
- le modele de donnees devra etre redesigne, car Firestore et Postgres ne se mappent pas en 1:1

### Ce qu'il faut preserver

- Les ecrans et usages:
  - login
  - chantiers
  - participants
  - taches
  - documents
  - offres/factures/contrats/avancement/assurances
  - amis
  - messagerie
  - profils
  - plans
- Les exemples metier et jeux de cas presents dans le code
- Les contenus deja presents dans Firebase si on fait une vraie migration de donnees

### Contraintes fortes

- Je n'ai actuellement ni projet Supabase configure dans ce depot, ni URL/cle Supabase.
- Je n'ai pas de script d'export Firebase existant dans le repo.
- La migration reelle des donnees exigera:
  - acces au projet Firebase source
  - acces au projet Supabase cible
  - schema SQL cible valide

### Strategie recommandee

1. Concevoir le schema Supabase cible
2. Introduire un client Supabase cote front
3. Remplacer Auth
4. Remplacer Storage
5. Remplacer lecture/ecriture Firestore par tables SQL
6. Remplacer le temps reel Firestore par Supabase Realtime la ou necessaire
7. Gerer separement notifications et analytics
8. Migrer les donnees existantes
9. Supprimer Firebase du code

### Schema Supabase cible envisage

Tables probables:
- `users`
- `profiles`
- `projects` ou `chantiers`
- `project_participants`
- `project_sections`
- `project_tasks`
- `project_documents`
- `project_admin_documents`
- `project_conversations`
- `project_conversation_participants`
- `project_messages`
- `friendships`
- `direct_conversations`
- `direct_conversation_participants`
- `direct_messages`
- `user_directories`
- `user_directory_documents`
- `plans`
- `plan_versions`

Buckets probables:
- `documents`
- `plans`
- `chat-files`
- `admin-files`

### Mapping principal Firebase -> Supabase

- `Utilisateurs/{uid}` -> `users`
- `Utilisateurs/{uid}/Profiles/profileData` -> `profiles`
- `Utilisateurs/{uid}/amis/*` -> `friendships`
- `Utilisateurs/{uid}/tasks/*` -> `user_tasks`
- `Utilisateurs/{uid}/directories/*` -> `user_directories`
- `chantiers/*` -> `chantiers`
- `chantiers/{id}/participants/*` -> `chantier_participants`
- `chantiers/{id}/todos/*` -> `chantier_tasks`
- `chantiers/{id}/conversations/*` -> `chantier_conversations`
- `.../messages/*` -> `messages`
- Storage Firebase -> Supabase Storage buckets

### Points de refonte obligatoires

- Les sous-collections Firestore doivent devenir des tables relationnelles.
- Les tableaux `participants` dans les documents chantier doivent etre remplaces par de vraies relations.
- Les requetes `where('participants', '==', participantIds)` doivent etre remplacees par une modelisation relationnelle correcte.
- Les listeners `onSnapshot` doivent etre remplaces par:
  - requetes SQL standard
  - subscriptions Realtime ciblees seulement la ou c'est utile

## 11. Etat d'avancement migration

### Fait

- Analyse complete du depot
- Inventaire des usages Firebase
- Identification des modules impactes
- Verification que Firebase est fortement couple a presque toutes les pages metier
- Mise a jour de ce fichier pour suivre specifiquement la migration Supabase
- Installation du SDK `@supabase/supabase-js`
- Creation d'un client front initial dans `src/supabase.js`
- Ajout d'un fichier `.env.example` pour documenter les variables Firebase et Supabase
- Ajout d'un draft de schema SQL initial dans `supabase/001_initial_schema.sql`
- Ajout des variables Supabase dans `.env.local` pour le travail local
- Verification build apres preparation Supabase: OK
- Migration initiale de l'auth vers Supabase
- Creation d'une couche de compatibilite `src/auth.js`
- `Login.js` bascule vers `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Synchronisation de base de l'utilisateur authentifie vers:
  - table Supabase `users`
  - table Supabase `profiles`
  - collection Firebase `Utilisateurs`
- `Chantier.js` et `Todo.js` adaptes pour ne plus dependre directement de Firebase Auth

### En cours

- Cadrage du plan de migration
- Preparation du mapping conceptuel Firebase -> Supabase
- Preparation du socle technique cote front
- Stabilisation de la transition auth pendant que Firestore/Storage restent actifs

### Pas encore fait

- Definition du schema SQL exact
- Scripts de migration de donnees
- Remplacement du code front Firebase
- Suppression de Firebase
- Migration de tous les ecrans encore couples implicitement aux anciens UID Firebase

## 12. Fichiers les plus impactes par la migration

- `src/pages/Login.js`
- `src/pages/Chantier.js`
- `src/pages/Acteurs.js`
- `src/pages/Amis.js`
- `src/pages/Todo.js`
- `src/pages/ToDoList.js`
- `src/pages/Documents.js`
- `src/pages/FileManager.js`
- `src/pages/Plan.js`
- `src/pages/Offres.js`
- `src/pages/Factures.js`
- `src/pages/Contrat.js`
- `src/pages/Avancement.js`
- `src/pages/Assurance.js`
- `src/pages/Profil.js`
- `src/pages/Chat.js`
- `package.json`

## 13. Decisions a prendre avant migration reelle

- Est-ce qu'on garde Google login uniquement, ou ajoute email/mot de passe aussi?
- Est-ce qu'on conserve les notifications push, ou on les retire temporairement?
- Est-ce qu'on migre les donnees existantes Firebase, ou seulement le code et la structure?
- Est-ce qu'on garde CRA pour l'instant, ou on combine avec une migration vers Vite?

## 14. Prochaine etape utile

La prochaine etape propre est:
- valider puis appliquer le schema SQL dans Supabase
- connecter l'auth Supabase en premier
- migrer ensuite `Profil`, `Chantier`, puis les modules documents/taches/messages
- garder Firebase en parallele tant que chaque bloc n'a pas ete bascule

## 15. Etat concret dans le depot

Fichiers ajoutes ou prepares pour la migration:
- `src/supabase.js`
- `.env.example`
- `supabase/001_initial_schema.sql`

Configuration locale preparee:
- variables Supabase ajoutees a `.env.local`
- compatibilite prevue avec noms `REACT_APP_*` et `NEXT_PUBLIC_*`

Point de securite:
- l'URL PostgreSQL complete et le mot de passe base de donnees ne doivent pas etre utilises cote navigateur
- pour le front, seule l'URL Supabase et la cle publique sont necessaires

## 16. Etat Auth Supabase

### Code

- `src/auth.js` expose:
  - `auth.currentUser`
  - `auth.onAuthStateChanged(...)`
  - `getCurrentUser()`
  - `signInWithGoogle()`
  - `signOut()`
  - `syncAuthenticatedUser()`
- `src/pages/Login.js` utilise desormais Supabase Auth Google
- L'application compile toujours apres ce basculement

### Important a configurer dans Supabase Dashboard

- Activer le provider Google dans `Authentication > Providers`
- Configurer le `Google Client ID` et le `Google Client Secret`
- Ajouter l'URL de site
- Ajouter l'URL de redirection de callback, au minimum:
  - `http://localhost:3000/login`
  - et plus tard ton domaine prod si necessaire

### Risque restant

- Les anciens documents Firestore lies aux UID Firebase historiques ne correspondront pas automatiquement aux nouveaux UID Supabase
- Les modules bases sur l'email continueront souvent a fonctionner
- Les modules lies strictement a `uid` pourront necessiter une migration de donnees dediee
