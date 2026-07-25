import { Hono } from "hono";
import type { ListarRecursos } from "../../application/useCase/ListarRecursos";
import type { ObtenerRecurso } from "../../application/useCase/ObtenerRecurso";
import type { SubirRecurso } from "../../application/useCase/SubirRecurso";
import { responderErrorHttp } from "./RutasClases";

export interface DependenciasRutasRecursos {
  subirRecurso: SubirRecurso;
  listarRecursos: ListarRecursos;
  obtenerRecurso: ObtenerRecurso;
}

export function crearRutasRecursos(
  dependencias: DependenciasRutasRecursos,
): Hono {
  const rutas = new Hono();
  rutas.onError(responderErrorHttp);

  rutas.post("/api/proyectos/:carpeta/recursos", async (contexto) => {
    const { archivo } = await contexto.req.parseBody();
    if (!(archivo instanceof File)) {
      return contexto.json({ error: "Falta el campo «archivo»" }, 400);
    }

    const resultado = await dependencias.subirRecurso.ejecutar({
      carpeta: contexto.req.param("carpeta"),
      nombre: archivo.name,
      tipo: archivo.type,
      datos: new Uint8Array(await archivo.arrayBuffer()),
    });
    return contexto.json(resultado, 201);
  });

  rutas.get("/api/proyectos/:carpeta/recursos", async (contexto) => {
    const archivos = await dependencias.listarRecursos.ejecutar(
      contexto.req.param("carpeta"),
    );
    return contexto.json({ archivos });
  });

  rutas.get("/api/proyectos/:carpeta/recursos/:archivo", async (contexto) => {
    const recurso = await dependencias.obtenerRecurso.ejecutar(
      contexto.req.param("carpeta"),
      contexto.req.param("archivo"),
    );
    return contexto.body(new Uint8Array(recurso.datos), 200, {
      "content-type": recurso.tipoContenido,
    });
  });

  return rutas;
}
