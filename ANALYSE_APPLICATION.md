# Analyse Application Build In Peace

Date: 2026-03-24
Contexte: mémoire de travail créée pendant une analyse complète du dépôt pour garder une trace persistante de l’architecture, des flux et des points sensibles.

## 1. Résumé rapide

- Application React 18 créée avec Create React App.
- UI principalement en Tailwind utilitaire + quelques styles CSS.
- Backend entièrement centré sur Firebase:
  - Auth Google
  - Firestore
  - Storage
  - Analytics
  - Cloud Messaging
- Domaine métier: gestion de chantiers, documents, tâches, participants, messagerie, plans annotables, profil et réseau d’amis.

## 2. Entrées principales

- `src/index.js`: bootstrap React classique.
- `src/App.js`: routage principal.
- `src/firebase.js`: initialisation Firebase, Auth, Firestore, Storage, Analytics, Messaging.
- `firebase.json`: hébergement SPA via rewrite global vers `index.html`.

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
- Le vrai flux chantier passe surtout par `Dashboard` -> `Chantier`, qui gère son propre état local au lieu d’utiliser pleinement les sous-routes React Router.
- `Conversations.js` est un placeholder et semble dépassé par `Acteurs.js`.

## 4. Parcours utilisateur

### Accueil / Auth

- `Home` affiche une landing très simple avec `Navbar` et `BuildInPeace`.
- `Login` fait un `signInWithPopup` Google.
- Après connexion:
  - création du document utilisateur si absent dans `Utilisateurs/{uid}`
  - redirection vers `/dashboard/chantiers`

### Dashboard

- `Dashboard` contient la navigation principale.
- Si l’URL contient `/dashboard/chantiers`, il injecte le module `Chantier`.
- La sidebar est responsive, mais une partie de l’UX est codée en dur et non branchée.

### Gestion des chantiers

- `Chantier.js` est le centre métier de l’application.
- Capacités:
  - lister les chantiers visibles pour l’utilisateur connecté
  - créer un chantier
  - sélectionner un chantier
  - inviter des intervenants
  - modifier/supprimer des participants
  - filtrer les menus selon le rôle
  - afficher les modules métier du chantier:
    - Administratif
    - Documents
    - Plan
    - Tâches
    - Acteurs

### Administratif chantier

Modules séparés:
- `Offres.js`
- `Factures.js`
- `Contrat.js`
- `Avancement.js`
- `Assurance.js`

Pattern commun:
- upload de PDF ou fichier sur Firebase Storage
- métadonnées sauvegardées dans une sous-collection Firestore du chantier
- liste, ajout, suppression

### Documents chantier

- `Documents.js` gère une arborescence de catégories/sous-catégories codée en dur.
- Les fichiers sont stockés dans Storage.
- Les métadonnées sont stockées dans une structure Firestore profondément imbriquée sous `chantiers/{chantierId}/categories/...`.

### Plan annotable

- `Plan.js` permet:
  - upload d’images/plan dans Storage
  - sélection d’un plan
  - annotation avec Konva
  - dessin libre, rectangle, cercle, flèche, texte
  - sauvegarde de versions uniquement en mémoire React

Point clé:
- les versions annotées ne sont pas persistées en Firestore ou Storage, seulement dans le state local de la session.

### Tâches chantier

- `Todo.js` gère les tâches d’un chantier:
  - sections
  - création multi-étapes
  - responsables
  - tâches terminées / archivées
  - détails d’une tâche

### Tâches personnelles

- `ToDoList.js` gère:
  - tâches personnelles utilisateur
  - tâches assignées provenant des chantiers
  - commentaires

### Amis et messagerie privée

- `Amis.js` gère:
  - invitations entre utilisateurs
  - acceptation/refus
  - création de conversation privée
  - chat texte/fichier/audio/image
  - visualisation du profil d’un ami

### Acteurs et messagerie chantier

- `Acteurs.js` gère:
  - récupération des participants du chantier
  - conversation générale
  - conversations privées entre participants
  - fichiers, images, audio
  - consultation du profil d’un membre

### Profil

- `Profil.js` stocke un profil étendu sous:
  - `Utilisateurs/{uid}/Profiles/profileData`

### File manager utilisateur

- `FileManager.js` gère des répertoires personnels utilisateur et des documents associés.

## 5. Schéma Firestore observé

### Utilisateurs

- `Utilisateurs/{uid}`
  - `displayName`
  - `email`
  - `uid`
  - éventuellement `sections`
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

### Conversations privées globales

- `conversations/{conversationId}`
- `conversations/{conversationId}/messages/{messageId}`

## 6. Schéma Storage observé

- `documents/{uid}/{fileName}`
- `plans/{chantierId}/{fileName}`
- `conversations/{conversationId}/{fileName}`
- chemins admin variables:
  - `.../offres/...`
  - `.../factures/...`
  - `.../contrat/...`
  - `.../avancement/...`
  - `.../assurances/...`
  - documents chantier imbriqués

## 7. Forces actuelles

- Le périmètre fonctionnel est déjà large.
- Firebase est utilisé de manière cohérente sur la majorité des flux.
- Les vues principales sont responsives.
- La logique métier chantier est déjà bien découpée par modules.
- Le build production passe actuellement.

## 8. Risques et incohérences majeurs

### Architecture

- `Chantier.js` concentre énormément de responsabilités.
- Une partie du routage existe mais le vrai pilotage se fait par état local.
- Plusieurs composants sont présents mais peu ou pas intégrés:
  - `ChatSubject`
  - `Subjects`
  - `ChantierSubMenu`
  - `Auteurs.js` vide
  - `Conversations.js` placeholder

### Données

- Le modèle Firestore est hétérogène:
  - participants parfois dans un array du document chantier
  - parfois dans une sous-collection `participants`
- `inviteIntervenant` écrit à la fois via `addDoc` dans la sous-collection et `updateDoc` sur l’array `participants`, avec risque de doublons et divergence.
- Les conversations utilisent `where('participants', '==', participantIds)`, ce qui dépend d’un ordre strict de tableau et reste fragile.
- `ToDoList.js` accumule potentiellement des listeners imbriqués sur tous les chantiers sans nettoyage fin par chantier.

### UX / logique

- `Plan.js`: les versions annotées sont perdues au rechargement.
- `Todo.js`: la photo d’une tâche est gardée en `URL.createObjectURL`, pas persistée dans Storage.
- `Documents.js`: catégories codées en dur, donc peu extensible.
- `Dashboard.js`: notifications déclarées mais non utilisées.
- `Conversations.js` n’apporte pas de vraie valeur fonctionnelle.

### Qualité de code

- Beaucoup de `console.log`, code mort et imports inutilisés.
- Plusieurs `useEffect` ont des dépendances manquantes.
- Encodage texte abîmé à plusieurs endroits (`Ã©`, `TÃ¢ches`, etc.), signe probable de fichiers sauvés avec un mauvais encodage.

### Dépendances / socle technique

- Le projet repose sur Create React App, qui est maintenant obsolète.
- Le build remonte un avertissement Babel lié à CRA non maintenu.
- `public/firebase-messaging-sw.js` utilise `process.env`, ce qui ne fonctionne pas comme dans le bundle React standard pour un fichier public servi tel quel.
- `.env.local` est présent dans le workspace; vérifier s’il est ignoré et non committé avant partage.

## 9. Vérification effectuée

Commande exécutée:
- `npm.cmd run build`

Résultat:
- build production OK
- compilation avec warnings ESLint seulement

Constats build:
- bundle principal assez lourd: environ 333 kB gzip
- nombreux warnings `no-unused-vars` et `react-hooks/exhaustive-deps`
- warning CRA/Babel de maintenance

## 10. Migration Firebase -> Supabase

### Objectif

Remplacer Firebase par Supabase tout en conservant les exemples existants, c’est-à-dire:
- conserver les parcours fonctionnels actuels
- conserver la logique métier visible dans l’interface
- conserver autant que possible la structure de données utile
- garder une mémoire claire de l’avancement dans ce fichier

### Faisabilité

Oui, la migration est faisable, mais ce n’est pas un simple remplacement de SDK.

Firebase utilisé dans le projet:
- Auth Google
- Firestore temps réel
- Storage
- Analytics
- Cloud Messaging

Équivalents Supabase:
- Auth Google -> Supabase Auth OK
- Firestore -> Postgres + Realtime + RPC/Views
- Storage -> Supabase Storage OK
- Analytics -> pas d’équivalent direct natif
- Cloud Messaging -> hors périmètre Supabase natif, à repenser

Conclusion:
- la migration du cœur applicatif est faisable
- `Analytics` et surtout `Cloud Messaging` devront être remplacés ou supprimés
- le modèle de données devra être redesigné, car Firestore et Postgres ne se mappent pas en 1:1

### Ce qu’il faut préserver

- Les écrans et usages:
  - login
  - chantiers
  - participants
  - tâches
  - documents
  - offres/factures/contrats/avancement/assurances
  - amis
  - messagerie
  - profils
  - plans
- Les exemples métier et jeux de cas présents dans le code
- Les contenus déjà présents dans Firebase si on fait une vraie migration de données

### Contraintes fortes

- Je n’ai actuellement ni projet Supabase configuré dans ce dépôt, ni URL/clé Supabase.
- Je n’ai pas de script d’export Firebase existant dans le repo.
- La migration réelle des données exigera:
  - accès au projet Firebase source
  - accès au projet Supabase cible
  - schéma SQL cible validé

### Stratégie recommandée

1. Concevoir le schéma Supabase cible
2. Introduire un client Supabase côté front
3. Remplacer Auth
4. Remplacer Storage
5. Remplacer lecture/écriture Firestore par tables SQL
6. Remplacer le temps réel Firestore par Supabase Realtime là où nécessaire
7. Gérer séparément notifications et analytics
8. Migrer les données existantes
9. Supprimer Firebase du code

### Schéma Supabase cible envisagé

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
- Les tableaux `participants` dans les documents chantier doivent être remplacés par de vraies relations.
- Les requêtes `where('participants', '==', participantIds)` doivent être remplacées par une modélisation relationnelle correcte.
- Les listeners `onSnapshot` doivent être remplacés par:
  - requêtes SQL standard
  - subscriptions Realtime ciblées seulement là où c’est utile

## 11. État d’avancement migration

### Fait

- Analyse complète du dépôt
- Inventaire des usages Firebase
- Identification des modules impactés
- Vérification que Firebase est fortement couplé à presque toutes les pages métier
- Mise à jour de ce fichier pour suivre spécifiquement la migration Supabase
- Installation du SDK `@supabase/supabase-js`
- Création d’un client front initial dans `src/supabase.js`
- Ajout d’un fichier `.env.example` pour documenter les variables Firebase et Supabase
- Ajout d’un draft de schéma SQL initial dans `supabase/001_initial_schema.sql`
- Ajout des variables Supabase dans `.env.local` pour le travail local
- Vérification build après préparation Supabase: OK
- Migration initiale de l’auth vers Supabase
- Création d’une couche de compatibilité `src/auth.js`
- Création de `src/firebaseApp.js` pour factoriser l’app Firebase sans boucle d’import
- `Login.js` basculé vers `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Synchronisation de base de l’utilisateur authentifié vers:
  - table Supabase `users`
  - table Supabase `profiles`
  - collection Firebase `Utilisateurs`
- `Chantier.js` et `Todo.js` adaptés pour ne plus dépendre directement de Firebase Auth

### En cours

- Cadrage du plan de migration
- Préparation du mapping conceptuel Firebase -> Supabase
- Préparation du socle technique côté front
- Stabilisation de la transition auth pendant que Firestore/Storage restent actifs

### Pas encore fait

- Définition du schéma SQL exact
- Scripts de migration de données
- Remplacement du code front Firebase
- Suppression de Firebase
- Migration de tous les écrans encore couplés implicitement aux anciens UID Firebase

## 12. Fichiers les plus impactés par la migration

- `src/firebase.js`
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
- `public/firebase-messaging-sw.js`
- `package.json`

## 13. Décisions à prendre avant migration réelle

- Est-ce qu’on garde Google login uniquement, ou ajoute email/mot de passe aussi?
- Est-ce qu’on conserve les notifications push, ou on les retire temporairement?
- Est-ce qu’on migre les données existantes Firebase, ou seulement le code et la structure?
- Est-ce qu’on garde CRA pour l’instant, ou on combine avec une migration vers Vite?

## 14. Prochaine étape utile

La prochaine étape propre est:
- valider puis appliquer le schéma SQL dans Supabase
- connecter l’auth Supabase en premier
- migrer ensuite `Profil`, `Chantier`, puis les modules documents/tâches/messages
- garder Firebase en parallèle tant que chaque bloc n’a pas été basculé

## 15. État concret dans le dépôt

Fichiers ajoutés ou préparés pour la migration:
- `src/supabase.js`
- `.env.example`
- `supabase/001_initial_schema.sql`

Configuration locale préparée:
- variables Supabase ajoutées à `.env.local`
- compatibilité prévue avec noms `REACT_APP_*` et `NEXT_PUBLIC_*`

Point de sécurité:
- l’URL PostgreSQL complète et le mot de passe base de données ne doivent pas être utilisés côté navigateur
- pour le front, seule l’URL Supabase et la clé publique sont nécessaires

## 16. État Auth Supabase

### Codé

- `src/auth.js` expose:
  - `auth.currentUser`
  - `auth.onAuthStateChanged(...)`
  - `getCurrentUser()`
  - `signInWithGoogle()`
  - `signOut()`
  - `syncAuthenticatedUser()`
- `src/pages/Login.js` utilise désormais Supabase Auth Google
- L’application compile toujours après ce basculement

### Important à configurer dans Supabase Dashboard

- Activer le provider Google dans `Authentication > Providers`
- Configurer le `Google Client ID` et le `Google Client Secret`
- Ajouter l’URL de site
- Ajouter l’URL de redirection de callback, au minimum:
  - `http://localhost:3000/login`
  - et plus tard ton domaine prod si nécessaire

### Risque restant

- Les anciens documents Firestore liés aux UID Firebase historiques ne correspondront pas automatiquement aux nouveaux UID Supabase
- Les modules basés sur l’email continueront souvent à fonctionner
- Les modules liés strictement à `uid` pourront nécessiter une migration de données dédiée
