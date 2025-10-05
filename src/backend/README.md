## Backend Overview

This backend powers tiling jobs and exposes REST endpoints for the frontend Explore page. It is built with Fastify, Prisma, and a tiling job that shells out to `gdal2tiles` via Python.


### Entry point
- `index.ts`
  - Creates the Fastify app, enables CORS, registers routes, and starts the server.
  - Health check: `GET /api/health`.


### Configuration
- `config/env.ts`
  - Loads environment variables with `dotenv`.
  - Key envs used by the backend/tiler:
    - `DATABASE_URL` — Prisma DB connection (SQLite in dev).
    - `WEB_PROJECT_ROOT` — project root for writing tiles to `public/tiles/<id>` in dev.
    - `GDAL_PYTHON` — path to a Python that has GDAL (optional; defaults to `python`).
    - `TILE_FAST_MODE` — enable faster tiling (see `jobs/tiler_job.ts`).
    - `TILE_FAST_MAX_Z`, `TILE_PROCESSES`, `TILE_JPEG_QUALITY` — tuning knobs for fast mode.
    - `AZURE_TILES_BASE`, `AZURE_TILES_SAS`, `AZURE_ORIGINALS_BASE` — used in production upload flow.


### Database (Prisma)
- `prisma/schema.prisma`
  - Prisma schema defining the `Image` model: dimensions, tile settings, status, and tiles base path/URL.
  - Dev typically uses SQLite: `DATABASE_URL=file:./src/backend/prisma/dev.db` (set in your shell or `.env`).
- `db/prisma.ts`
  - Exports a singleton `PrismaClient` used across controllers/services.


### HTTP layer
- `routes/images_routes.ts`
  - Declares routes under the prefix `/api/images`:
    - `GET /` → list images
    - `GET /:id` → get an image
    - `POST /:id/tile` → trigger tiling
- `controllers/images_controller.ts`
  - Implements the route handlers using `ImagesService` and the tiling job.
  - `listImages`, `getImage`, `triggerTile` (fire-and-forget tiler).


### Domain service
- `services/images_service.ts`
  - A small service around the `Image` model.
  - `list()`, `getById(id)`, `create({...})`, `markTilingStarted(id)`, `markTilingFailed(id)`, `updateTilesMeta(id, data)`, `delete(id)`.
  - Computes an initial `maxZoom` using helpers before the tiler overwrites final values.


### Tiling job
- `jobs/tiler_job.ts`
  - Orchestrates tiling for a given `imageId`.
  - Looks up the `Image` in the DB, marks status to `tiling`, runs `gdal2tiles`, then updates metadata (`tileSize`, `maxZoom`, `format`, `tilesBase`, `status=ready`).
  - Development mode: writes tiles to `${WEB_PROJECT_ROOT}/public/tiles/<imageId>` for instant serving by Next.js.
  - Fast mode: enable with `TILE_FAST_MODE=1` to use bigger tiles (512), cap `maxZoom`, use multiple processes, JPEG tiles, and faster resampling.
  - Production mode: downloads the original, tiles to a temp dir, and uploads to Azure Blob Storage (when `AZURE_*` envs are set).


### Utilities
- `../../lib/tiler.ts` (referenced from the backend)
  - `computeMaxZoom(width, height, tileSize)` — estimates the deepest zoom needed.
  - `spawnProc(cmd, args)` — runs external processes, streaming output.
  - `gdalArgsXYZ(src, outDir, opts)` — builds `gdal2tiles` arguments (supports fast mode options, processes, resampling, JPEG quality, etc.).


### Data
- `data/earth_snapshot.tif` — sample source GeoTIFF used in local testing.
- `data/uploads/` — where you place original images for tiling in dev (e.g., `uploads/<imageId>.tif`).


### Typical request flow
1. Frontend calls `POST /api/images/:id/tile`.
2. Controller validates the image exists via `ImagesService.getById`.
3. Tiler job marks status to `tiling`, computes zoom/args, runs `gdal2tiles`.
4. On success, job updates DB with final `tileSize`, `maxZoom`, `format`, `tilesBase`, `status=ready`.
5. Frontend polls `GET /api/images/:id` or reloads the list to obtain updated metadata and starts requesting tiles from `${tilesBase}/{z}/{x}/{y}.${format}`.


### Notes
- Always ensure the backend process and Prisma CLI use the same `DATABASE_URL` so you see consistent data.
- On Windows PowerShell, prefer `Invoke-RestMethod` over `curl` (or use `curl.exe`) for API calls.
- If you change env vars, restart the backend.


