import { FastifyInstance } from "fastify";
import { listImages, getImage, triggerTile } from "../controllers/images_controller.js";

export async function imagesRoutes(app: FastifyInstance) {
  app.get("/", listImages);
  app.get("/:id", getImage);
  app.post("/:id/tile", triggerTile);
}
