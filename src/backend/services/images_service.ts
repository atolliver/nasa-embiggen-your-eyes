// backend/src/services/images.service.ts
import { prisma } from "../db/prisma";
import { computeMaxZoom } from "../../lib/tiler";

export type CreateImageInput = {
  name: string;
  description?: string;
  width: number;
  height: number;
};

export type UpdateTilesInput = {
  tileSize?: number;           // e.g. 256
  maxZoom?: number;            // computed; can be provided by tiler
  format?: "png" | "jpg";
  scheme?: "xyz" | "tms";
  tilesBase?: string;          // "/tiles/<id>" or Azure URL
  status?: "queued" | "tiling" | "ready" | "failed";
};

export const ImagesService = {
  async list() {
    return prisma.image.findMany({ orderBy: { createdAt: "desc" } });
  },

  async getById(id: string) {
    return prisma.image.findUnique({ where: { id } });
  },

  async create(input: CreateImageInput) {
    const { name, description = "", width, height } = input;
    const tileSize = 256;
    const maxZoom = computeMaxZoom(width, height, tileSize);

    return prisma.image.create({
      data: {
        name,
        description,
        width,
        height,
        tileSize,
        maxZoom,              // pre-fill; tiler can overwrite if needed
        format: "png",        // default; tiler can set to 'jpg'
        scheme: "xyz",        // we use --xyz in gdal2tiles
        tilesBase: "",        // filled when tiling completes
        status: "queued",
      },
    });
  },

  async markTilingStarted(id: string) {
    return prisma.image.update({
      where: { id },
      data: { status: "tiling" },
    });
  },

  async markTilingFailed(id: string, reason?: string) {
    // You could add a failureReason field in the model if you want to store details
    return prisma.image.update({
      where: { id },
      data: { status: "failed" },
    });
  },

  async updateTilesMeta(id: string, data: UpdateTilesInput) {
    return prisma.image.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.image.delete({ where: { id } });
  },
};
