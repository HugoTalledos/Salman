import { serve } from "@hono/node-server";
import os from "node:os";
import path from "node:path";
import { crearApp } from "./app";

const base =
  process.env.SALMAN_DIR ?? path.join(os.homedir(), "Documents", "Salman");
const puerto = Number(process.env.SALMAN_PUERTO ?? 8787);

serve({ fetch: crearApp(base).fetch, port: puerto }, () => {
  console.log(`Salman · proyectos en ${base} · API en http://localhost:${puerto}`);
});
