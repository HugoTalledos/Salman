import { serve } from "@hono/node-server";
import { crearApp } from "./app";
import { dirBasePorDefecto } from "./store";

const base = process.env.SALMAN_DIR ?? dirBasePorDefecto();
const puerto = Number(process.env.SALMAN_PUERTO ?? 8787);

serve({ fetch: crearApp(base).fetch, port: puerto }, () => {
  console.log(`Salman · proyectos en ${base} · API en http://localhost:${puerto}`);
});
