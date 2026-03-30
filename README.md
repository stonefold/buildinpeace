# Buildinpeace

Application SaaS de gestion de chantiers avec frontend React existant et backend Supabase.

## Stack cible

- Frontend: React 18 + CRA existant
- Backend: Supabase PostgreSQL, Auth, RLS, Realtime, Storage
- Deploiement front: Vercel
- Deploiement backend: Supabase

## Ce qui a ete mis en place

- Auth Google via Supabase
- Couche data `src/services/workspaceApi.js`
- Hook de chargement/mutations `src/hooks/useWorkspaceData.js`
- Integration du workspace reel dans `src/pages/WorkspaceV2.js`
- Migration SQL multi-tenant `supabase/002_workspace_production.sql`
- Buckets/Storage prives `workspace-assets`

## Audit et architecture

- Audit existant: [ANALYSE_APPLICATION.md](./ANALYSE_APPLICATION.md)
- Architecture cible et checklist projet: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## Variables d'environnement

Copier `.env.example` vers `.env.local` puis renseigner:

```bash
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
REACT_APP_SUPABASE_REDIRECT_URL=http://localhost:3000/
```

`SUPABASE_SERVICE_ROLE_KEY` ne doit jamais etre exposee cote navigateur.

## Setup local

1. Installer les dependances:

```bash
npm install
```

2. Executer les migrations SQL dans Supabase dans l'ordre:

```sql
supabase/001_initial_schema.sql
supabase/002_workspace_production.sql
```

3. Dans Supabase Dashboard:

- Activer Google dans `Authentication > Providers`
- Ajouter `http://localhost:3000/` comme redirect URL
- Verifier que Realtime est active pour `messages`, `tasks`, `documents`

4. Lancer l'application:

```bash
npm start
```

## Build

```bash
npm run build
```

Build verifie le `2026-03-30`.

## Deploiement

### Frontend

- Importer le repo dans Vercel
- Configurer:
  - `REACT_APP_SUPABASE_URL`
  - `REACT_APP_SUPABASE_ANON_KEY`
  - `REACT_APP_SUPABASE_REDIRECT_URL=https://<votre-domaine>/`

### Supabase

- Appliquer les migrations
- Activer Auth Google
- Configurer le bucket `workspace-assets`
- Verifier les policies RLS avant ouverture publique

## Commandes utiles

```bash
npm run build
npm test
```
