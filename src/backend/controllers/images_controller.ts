import { ImagesService } from "../services/images_service.js";
import { runTilerJob } from "../jobs/tiler_job.js";

export async function listImages(req: any, reply: any) {
  const images = await ImagesService.list();
  reply.send({ images });
}

export async function getImage(req: any, reply: any) {
  const { id } = req.params as { id: string };
  const image = await ImagesService.getById(id);
  if (!image) return reply.code(404).send({ error: "not found" });
  reply.send(image);
}

export async function triggerTile(req: any, reply: any) {
  const { id } = req.params as { id: string };
  const image = await ImagesService.getById(id);
  if (!image) return reply.code(404).send({ error: "not found" });

  // fire-and-forget (MVP). For queues, enqueue here instead.
  runTilerJob({ imageId: id }).catch(err => req.server.log.error(err));
  reply.send({ ok: true, started: true });
}
