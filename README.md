## nasa-embiggen-your-eyes — Local Dev Guide

This project tiles large images and serves them to the frontend Explore page for deep zoom viewing.

This guide walks you through:
- Setting up the database (SQLite; no Docker required)
- Running database migrations (Prisma)
- Starting the backend (Fastify)
- Seeding one image and triggering the tiler
- Running the frontend and viewing tiles
- How Prisma, the tiling job, and the REST API fit together


### Prerequisites
- Node.js 18+ (Node 22 works)
- A working Python install. For Windows, OSGeo4W or QGIS is easiest. You need `python -m osgeo_utils.gdal2tiles` available, or set `GDAL_PYTHON` to a Python that has GDAL installed
- Git (optional)


## 1) Install dependencies

```powershell
npm install
```


## 2) Configure environment

Local development uses SQLite. You can set environment variables per-shell or via `.env` files.

Recommended for PowerShell (run from project root):

```powershell
$env:DATABASE_URL = "file:./src/backend/prisma/dev.db"
$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000"
$env:WEB_PROJECT_ROOT = "."
# If you must point to a specific Python for gdal2tiles:
# $env:GDAL_PYTHON = "C:\Path\To\python.exe"
```

Alternatively, create a project-level `.env` with:

```
DATABASE_URL=file:./src/backend/prisma/dev.db
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
WEB_PROJECT_ROOT=.
```


## 3) Initialize the database (Prisma)

Prisma schema lives at `src/backend/prisma/schema.prisma`. Always point Prisma commands at that schema or run them from project root with `--schema`.

```powershell
npx prisma migrate dev --name init --schema=src/backend/prisma/schema.prisma
npx prisma generate --schema=src/backend/prisma/schema.prisma
```


## 4) Start the backend (Fastify)

```powershell
npx tsx src/backend/index.ts
```

Verify health:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
# => { ok = true }
```


## 5) Seed one image and trigger tiling

Copy a sample GeoTIFF and insert an `Image` row.

```powershell
mkdir -Force src\backend\data\uploads
copy src\backend\data\earth_snapshot.tif src\backend\data\uploads\earth.tif

# Open Prisma Studio to insert a row
npx prisma studio --schema=src/backend/prisma/schema.prisma
```

Create a new record in the `Image` model:
- id: `earth`
- name: any
- description: any
- width: actual width (use `gdalinfo` or a reasonable estimate)
- height: actual height
- tileSize: `256`
- maxZoom: `0` (placeholder; backend computes and updates it)
- format: `png`
- scheme: `xyz`
- tilesBase: (leave empty)
- status: `queued`

Trigger tiling (PowerShell-safe):

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/images/earth/tile -ContentType application/json -Body '{}'
```

What happens:
- In development (NODE_ENV != production), the tiler writes tiles into `public/tiles/<imageId>` inside this Next.js project (`WEB_PROJECT_ROOT` controls the base)
- The backend updates the `Image` row: `status=ready`, sets `tilesBase=/tiles/<imageId>`, `maxZoom` and other fields

Validate:

```powershell
Invoke-RestMethod http://localhost:4000/api/images  # should include the image you added
```

Check the files exist under `public/tiles/earth/...`.


## 6) Run the frontend and view Explore

```powershell
npm run dev
```

Open `http://localhost:3000/explore`. The page loads the images list from `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:4000`) and displays the selected image via `DeepZoomViewer`, requesting tiles from `/tiles/<id>/{z}/{x}/{y}.png`.


## How the pieces fit together

### Prisma (database layer)
- Prisma connects to SQLite (dev) via `DATABASE_URL`
- The schema in `src/backend/prisma/schema.prisma` defines the `Image` model with fields for dimensions, tiling scheme, tiles base URL/path, and status
- Backend code imports a singleton `PrismaClient` from `src/backend/db/prisma.ts`

### Database → REST connections
- Fastify app: `src/backend/index.ts`
- Routes: `src/backend/routes/images_routes.ts`
  - `GET /api/images` → list images (controller: `listImages`)
  - `GET /api/images/:id` → get one image (controller: `getImage`)
  - `POST /api/images/:id/tile` → trigger tiling (controller: `triggerTile`)
- Controllers: `src/backend/controllers/images_controller.ts`
  - Use Prisma to query/update the `Image` table
  - Fire-and-forget the tiling job when `POST /:id/tile` is called

### The tiling flow (dev mode)
- Job: `src/backend/jobs/tiler_job.ts`
- Computes `maxZoom` based on width/height and `tileSize`
- Calls `python -m osgeo_utils.gdal2tiles --xyz` via helper functions in `src/lib/tiler.ts`
- Output directory in dev: `${WEB_PROJECT_ROOT}/public/tiles/<imageId>`
- After tiles are generated, updates the `Image` row: `tileSize`, `maxZoom`, `format`, `scheme`, `tilesBase`, `status=ready`

In production, the job is set up to tile into a temp directory and upload to Azure Blob Storage (see `AZURE_*` envs in `tiler_job.ts`).

### Frontend Explore page
- Page: `src/app/explore/page.tsx`
- Fetches `GET {NEXT_PUBLIC_API_BASE_URL}/api/images`
- Passes the selected image’s metadata to `src/app/components/DeepZoomViewer.tsx` (Leaflet)
- Viewer constructs tile URLs: `${tilesBase}/{z}/{x}/{y}.${format}` and fits the view to the image size


## Troubleshooting

- Prisma cannot find schema
  - Use `--schema=src/backend/prisma/schema.prisma` with Prisma commands

- `P1012 Environment variable not found: DATABASE_URL`
  - Ensure `$env:DATABASE_URL` is set in every shell where you run Prisma or the backend

- Backend won’t start due to top-level await
  - `src/backend/index.ts` uses an async `start()` function to avoid top-level await; ensure you’re running the updated file from project root: `npx tsx src/backend/index.ts`

- Fastify plugin version mismatch
  - If you see an error about `@fastify/cors` requiring Fastify 5, upgrade Fastify: `npm i fastify@^5`

- POST from PowerShell returns 415 or wrong method
  - Use PowerShell-native: `Invoke-RestMethod -Method Post -Uri ... -ContentType application/json -Body '{}'`
  - Or force curl.exe: `curl.exe -X POST http://localhost:4000/...`

- Tiles not visible in Explore
  - Confirm files exist under `public/tiles/<id>/...`
  - `Image.tilesBase` should be `/tiles/<id>` and `status` should be `ready`
  - Ensure `NEXT_PUBLIC_API_BASE_URL` points to your backend (e.g., `http://localhost:4000`)


## Reference paths
- Backend entry: `src/backend/index.ts`
- Routes: `src/backend/routes/images_routes.ts`
- Controllers: `src/backend/controllers/images_controller.ts`
- Tiling job: `src/backend/jobs/tiler_job.ts`
- Tiler helpers: `src/lib/tiler.ts`
- Prisma schema: `src/backend/prisma/schema.prisma`
- Frontend Explore: `src/app/explore/page.tsx`
- Deep zoom viewer: `src/app/components/DeepZoomViewer.tsx`

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
