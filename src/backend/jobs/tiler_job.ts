import path from "node:path";
import { prisma } from "../db/prisma.js";
import { computeMaxZoom, spawnProc, gdalArgsXYZ } from "../../lib/tiler.js";

const PYTHON = process.env.GDAL_PYTHON || "python";
// Where Next.js project root lives (so tiles go to <root>/public/tiles)
const WEB_ROOT = process.env.WEB_PROJECT_ROOT || process.cwd();
const AZ_TILES_BASE = process.env.AZURE_TILES_BASE;      // https://acct.blob.core.windows.net/tiles
const AZ_TILES_SAS  = process.env.AZURE_TILES_SAS || ""; // ?sv=...

export async function runTilerJob({ imageId }: { imageId: string }) {
  const img = await prisma.image.findUnique({ where: { id: imageId } });
  if (!img) throw new Error("image not found");

  await prisma.image.update({ where: { id: imageId }, data: { status: "tiling" } });

  const fastMode = process.env.TILE_FAST_MODE === "1" || process.env.TILE_FAST_MODE === "true";
  const baseTileSize = fastMode ? 512 : 256;
  const computedMaxZoom = computeMaxZoom(img.width, img.height, baseTileSize);
  // Cap max zoom in fast mode to reduce work (e.g., 0-4 levels)
  const maxZoom = fastMode ? Math.min(computedMaxZoom, Number(process.env.TILE_FAST_MAX_Z || 4)) : computedMaxZoom;

  // ----- DEV: write tiles into web/public for instant viewing -----
  if (process.env.NODE_ENV !== "production") {
    const outDir = path.resolve(WEB_ROOT, "public", "tiles", imageId);
    // Resolve uploads relative to the backend source directory
    const srcLocal = path.resolve(__dirname, "..", "data", "uploads", `${imageId}.tif`); // or .jpg/.png
    const args = gdalArgsXYZ(srcLocal, outDir, {
      maxZoom,
      tileSize: baseTileSize,
      processes: Number(process.env.TILE_PROCESSES || (fastMode ? 4 : 2)),
      resampling: fastMode ? "bilinear" : undefined,
      format: fastMode ? "jpg" : "png",
      jpegQuality: fastMode ? Number(process.env.TILE_JPEG_QUALITY || 85) : undefined,
    });
    await spawnProc(PYTHON, args);

    // detect format (check a sample tile)
    const format: "png" | "jpg" = fastMode ? "jpg" : "png";
    await prisma.image.update({
      where: { id: imageId },
      data: {
        tileSize: baseTileSize,
        maxZoom,
        format,
        scheme: "xyz",
        tilesBase: `/tiles/${imageId}`,
        status: "ready",
      }
    });
    return;
  }

  // ----- PROD: download original, tile to /tmp, azcopy → Azure -----
  const srcUrl = `${process.env.AZURE_ORIGINALS_BASE}/${imageId}.tif`; // adjust ext as needed
  const tmpIn  = path.resolve("data", "tmp", `${imageId}.tif`);
  const tmpOut = path.resolve("data", "tmp", `${imageId}`);

  // download with azcopy (or Azure SDK)
  await spawnProc("azcopy", ["copy", srcUrl, tmpIn]);
  await spawnProc(PYTHON, gdalArgsXYZ(tmpIn, tmpOut, {
    maxZoom,
    tileSize: baseTileSize,
    processes: Number(process.env.TILE_PROCESSES || (fastMode ? 8 : 4)),
    resampling: fastMode ? "bilinear" : undefined,
    format: fastMode ? "jpg" : "png",
    jpegQuality: fastMode ? Number(process.env.TILE_JPEG_QUALITY || 85) : undefined,
  }));

  const dest = `${AZ_TILES_BASE}/${imageId}${AZ_TILES_SAS}`;
  await spawnProc("azcopy", ["sync", tmpOut, dest, "--recursive"]);

  await prisma.image.update({
    where: { id: imageId },
    data: {
      tileSize: baseTileSize,
      maxZoom,
      format: fastMode ? "jpg" : "png", // or detect
      scheme: "xyz",
      tilesBase: `${process.env.AZURE_TILES_BASE}/${imageId}`,
      status: "ready",
    }
  });
}
