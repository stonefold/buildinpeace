# Architecture Buildinpeace

## Audit synthetique

- Le depot contenait deux applications en parallele:
  - un legacy Firebase multi-pages dans `src/pages/*`
  - l'UI reellement montee via `src/App.js` dans [`src/pages/WorkspaceV2.js`](../src/pages/WorkspaceV2.js)
- `WorkspaceV2` concentrait toute la logique metier avec donnees mockees dans `src/data/demoData.js`
- Le build passait, mais le contrat de donnees reel n'existait pas
- Le repo incluait deja un brouillon Supabase partiel, non aligne avec un vrai modele multi-tenant

## Ecrans et entites deduites depuis l'UI

- Pilotage: `organizations`, `projects`, `activity_events`, metriques
- Chantiers: `projects`, `project_sections`, `project_members`, `project_invitations`
- Administratif: `documents` types `Offres`, `Factures`, `Contrats`, `Assurances`, `Avancement`
- Documents: `documents`
- Plans: `plans`, `plan_versions`
- Taches projet/personnelles: `tasks`, `task_assignees`, `task_comments`
- Acteurs / messagerie: `conversations`, `conversation_members`, `messages`
- Profil: `profiles`
- Notifications: `notifications`

## Architecture cible

### Client

- `src/auth.js`: session Supabase Auth
- `src/hooks/useWorkspaceData.js`: chargement, realtime, mutations
- `src/services/workspaceApi.js`: acces SQL/Storage Supabase et mapping UI
- `src/pages/WorkspaceV2.js`: UI conservee, branchee aux donnees reelles

### Backend

- `profiles`: profil applicatif lie a `auth.users`
- `organizations`: tenant principal
- `organization_members`: appartenance au tenant
- `projects`: chantiers rattaches a une organisation
- `project_members`: permissions et visibilite chantier
- `project_invitations`: invitations securisees
- `project_sections`: sections/onglets metier des taches
- `tasks` + `task_assignees`: taches projet et personnelles
- `documents`: administratif et documents chantier
- `plans` + `plan_versions`: plans et annotations versionnees
- `conversations` + `conversation_members` + `messages`: messagerie chantier/directe
- `activity_events`: journal d'activite
- `notifications`: notifications utilisateur

## Roles

- Organisation:
  - `owner`
  - `admin`
  - `manager`
  - `member`
  - `guest`
- Chantier:
  - `project_manager`
  - `contractor`
  - `architect`
  - `worker`
  - `client`
  - `subcontractor`

## Regles d'acces

- Non connecte:
  - aucun acces aux tables metier
- Connecte:
  - acces a son propre `profile`
  - acces aux organisations dont il est membre
- Membre d'organisation:
  - lecture des projets de son tenant uniquement si membre du chantier
- Membre de chantier:
  - lecture `projects`, `project_members`, `project_sections`, `documents`, `plans`, `activity_events`
  - lecture/ecriture `messages` uniquement s'il appartient a `conversation_members`
- Manager chantier / admin organisation:
  - gestion `project_members`, `project_invitations`, `project_sections`, `documents`, `plans`, `tasks`

## Realtime

- Subscription frontend sur:
  - `messages`
  - `tasks`
  - `documents`
- Objectif:
  - rafraichir messagerie
  - repercuter changements collaboratifs sans serveur API separe

## Storage

- Bucket prive: `workspace-assets`
- Usage:
  - avatars
  - pieces jointes messages
  - futurs documents/plans binaires

## Deploiement

- Front: Vercel
- Backend: Supabase
- Secrets:
  - cote client: URL Supabase + anon key
  - cote serveur seulement: `SUPABASE_SERVICE_ROLE_KEY`

## Checklist production

- [ ] migrations 001 puis 002 appliquees
- [ ] Auth Google activee
- [ ] redirect URLs configurees
- [ ] bucket `workspace-assets` cree
- [ ] RLS activee sur toutes les tables exposees
- [ ] build `npm run build` OK
- [ ] tests metier prioritaires ajoutes
- [ ] monitoring et sauvegardes Supabase actives
