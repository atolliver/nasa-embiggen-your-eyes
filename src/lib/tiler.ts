import { spawn } from "node:child_process";
import path from "node:path";

export function computeMaxZoom(width: number, height: number, tileSize = 256) {
  const tilesW = Math.ceil(width / tileSize);
  const tilesH = Math.ceil(height / tileSize);
  return Math.ceil(Math.log2(Math.max(tilesW, tilesH)));
}

export function spawnProc(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: false });
    p.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)));
    p.on("error", reject);
  });
}

export type GdalTileOptions = {
  maxZoom: number;
  tileSize?: number;                 // default 256
  processes?: number;                // gdal2tiles --processes
  resampling?: "near" | "bilinear" | "cubic" | "cubicspline" | "lanczos" | "average" | "mode";
  format?: "png" | "jpg";          // jpg uses JPEG driver
  jpegQuality?: number;              // 1-100, if format = jpg
  extra?: string[];                  // escape hatch for extra args
};

export function gdalArgsXYZ(src: string, outDir: string, opts: GdalTileOptions) {
  const tileSize = opts.tileSize ?? 256;
  const args: string[] = [
    "-m", "osgeo_utils.gdal2tiles",
    "-p", "raster",
    "--xyz",
    "-z", `0-${opts.maxZoom}`,
    "--tilesize", `${tileSize}`,
    "--webviewer", "none",
    "--no-kml",
  ];

  if (opts.processes && opts.processes > 1) {
    args.push("--processes", String(opts.processes));
  }
  if (opts.resampling) {
    args.push("--resampling", opts.resampling);
  }
  if (opts.format === "jpg") {
    // Prefer JPEG for speed/smaller tiles
    args.push("--tiledriver", "JPEG");
    if (opts.jpegQuality) {
      args.push("--jpeg", String(opts.jpegQuality));
    }
  }
  if (opts.extra && opts.extra.length) {
    args.push(...opts.extra);
  }

  args.push(src, outDir);
  return args;
}
