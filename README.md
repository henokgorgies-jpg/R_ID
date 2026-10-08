# Kebele ID Registry

Resident registration and ID card management system built with Next.js, Prisma, and PostgreSQL.

## 1. Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 14+

## 2. Environment Setup

Create `.env` in project root:

```env
DATABASE_URL="postgresql://<db_user>:<db_password>@localhost:5432/<db_name>?schema=public"
```

Example (your local setup):

```env
DATABASE_URL="postgresql://bishu:235807**--@localhost:5432/Id_creator?schema=public"
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Database Migration

Run Prisma migrations:

```bash
npx prisma migrate dev
```

Generate Prisma client:

```bash
npx prisma generate
```

Optional: open DB UI

```bash
npx prisma studio
```

Enable pgvector if your PostgreSQL image does not preload extensions:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 5. Seed Database (Optional)

```bash
npm run db:seed
```

If `db:seed` script is missing, run:

```bash
node prisma/seed.mjs
```

## 6. Run Application

Prepare the Python environment once. This service is configured for Python 3.11, so use that interpreter explicitly if your system default is newer:

```bash
cd services/face-api
python3.11 -m venv .venv
source .venv/bin/activate
python -V
pip install -r requirements.txt
cd ../..
```

If `python3.11` is not installed on your machine, install or select Python 3.11 first (for example with `pyenv` or your OS package manager) before running the commands above.

Use GPU for InsightFace (optional):

```bash
cd services/face-api
source .venv/bin/activate
pip uninstall -y onnxruntime
pip install -r requirements-gpu.txt
cd ../..
```

Set provider order in `.env`:

```env
FACE_EXECUTION_PROVIDERS="CUDAExecutionProvider,CPUExecutionProvider"
```

Start both Next.js (port 3000) and Face API (port 8000) with one command:

```bash
npm run dev
```

If needed, you can still run each service separately:

```bash
npm run dev:next
npm run dev:face
```

Open:

- `http://localhost:3000`
- `http://localhost:8000/health`

`/health` now shows `activeProvider` so you can confirm GPU is active.

## 7. Useful Commands

- Type check:

```bash
npx tsc --noEmit
```

- Reset local DB (destructive):

```bash
npx prisma migrate reset
```

## 8. Current Workflow Rules (Implemented)

- New resident registration is created as pending (`inactive` + `idStatus: pending`).
- Only super admin can approve pending resident registration.
- ID generation is blocked for pending residents.
- Generate page only lists approved residents without an ID.
- All ID Cards page lists only residents with generated IDs.
- ID details page shows front/back template + issuance/reissue timeline.
- Reissue action exists from ID details page.
- Household linking rules:
  - `single` => only `head` or `child`
  - non-single => `head`, `spouse`, `child`, `relative`
  - linked household/head validation enforced server-side
- Parent linkage fields added:
  - `motherName`, `fatherResidentId`, `motherResidentId`
- Face pipeline:
  - On resident create/update photo, `faceStatus` moves to `pending`
  - Embedding extraction runs via `FACE_API_URL` (`/extract-embedding`)
  - Embeddings are stored in `ResidentFaceEmbedding` (`vector(512)`) with ANN index
  - Similarity search runs (`/search-similar` or pgvector fallback)
  - High-confidence matches create/update duplicate cases and audit logs

## 9. Task Backlog (To Be Implemented)

1. Add dedicated super-admin queue page for pending approvals (bulk approve/reject).
2. Add reject flow with reason tracking in audit log.
3. Add strict relationship graph validation (prevent circular/invalid family links).
4. Add household profile page (head, spouse, children, relatives, member timeline).
5. Add edit support for parent linkage fields in resident edit UI.
6. Add role-based visibility for approval and reissue actions in UI.
7. Add export endpoints (CSV/PDF) for residents and issued IDs.
8. Add automated tests:
   - API validation tests for resident create/approve/issue/reissue
   - UI tests for tabbed register flow and ID history timeline
9. Improve ID template print profile to exact CR80 card dimensions.
10. Add real authority logo assets and print-safe watermark design.

## 10. Memory Management

- Node/Next heap:
  - Set in `.env` if dev crashes with JS heap OOM:
    - `NODE_OPTIONS=--max-old-space-size=4096`
  - Start from `2048` or `4096` MB depending on your machine RAM.
- Prisma query strategy:
  - Avoid large `findMany` without pagination.
  - Select only required fields (`select`) to reduce object size.
- Face API (Python/InsightFace):
  - Keep one model instance loaded at process start (already implemented in `services/face-api/main.py`).
  - Avoid multiple Uvicorn workers in local dev; one worker is lower memory.
  - Use image downscaling before inference if uploads are very large.
- Operational checks:
  - Monitor memory during load (`top`/`htop`) and tune `NODE_OPTIONS` before productionizing.
  - Restart long-running dev servers periodically if memory fragmentation grows.

## 11. Notes

- Keep `.env` out of Git.
- Run migration after pulling latest changes.
- Configure shadow DB in `.env` (required by `prisma.config.ts`):

```env
SHADOW_DATABASE_URL="postgresql://<db_user>:<db_password>@localhost:5432/<db_name>_shadow?schema=public"
```

- Never edit an already-applied migration file in `prisma/migrations/*`.
  - If schema changes are needed, create a new migration:

```bash
npx prisma migrate dev --name <change_name>
```

  - Editing applied migrations causes checksum drift and reset prompts.
- If branches diverge during pull, use:

```bash
git pull --rebase --tags origin main
```
helloo