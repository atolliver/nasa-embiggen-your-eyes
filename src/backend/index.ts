import Fastify from "fastify";
import cors from "@fastify/cors";
import { imagesRoutes } from "./routes/images_routes.js";
import "./config/env.js";

const app = Fastify({ logger: true });

app.get("/api/health", async () => ({ ok: true }));

async function start() {
  await app.register(cors, { origin: ["http://localhost:3000"] });
  app.register(imagesRoutes, { prefix: "/api/images" });

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
