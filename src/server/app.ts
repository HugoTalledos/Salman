import { Hono } from "hono";
import { z } from "zod";
import { CompilarProyectoImpl } from "./clases/application/useCaseImpl/CompilarProyectoImpl";
import { CrearProyectoImpl } from "./clases/application/useCaseImpl/CrearProyectoImpl";
import { GuardarProyectoImpl } from "./clases/application/useCaseImpl/GuardarProyectoImpl";
import { ListarProyectosImpl } from "./clases/application/useCaseImpl/ListarProyectosImpl";
import { ListarRecursosImpl } from "./clases/application/useCaseImpl/ListarRecursosImpl";
import { ObtenerProyectoImpl } from "./clases/application/useCaseImpl/ObtenerProyectoImpl";
import { ObtenerRecursoImpl } from "./clases/application/useCaseImpl/ObtenerRecursoImpl";
import { SubirRecursoImpl } from "./clases/application/useCaseImpl/SubirRecursoImpl";
import { CompiladorHtml } from "./clases/infrastructure/compiler/CompiladorHtml";
import { crearRutasClases } from "./clases/infrastructure/http/RutasClases";
import { crearRutasRecursos } from "./clases/infrastructure/http/RutasRecursos";
import { ProyectoFileSystemRepository } from "./clases/infrastructure/persistence/ProyectoFileSystemRepository";
import { catalogoScaffolds } from "./clases/infrastructure/scaffold/CatalogoScaffolds";
import { ResponderConsultaImpl } from "./asistencia/application/useCaseImpl/ResponderConsultaImpl";
import {
  crearRutasAsistencia,
  MENSAJE_ASISTENTE_NO_CONFIGURADO,
} from "./asistencia/infrastructure/http/RutasAsistencia";
import { serializadorPrompt } from "./asistencia/infrastructure/llm/SerializarPrompt";
import type { ResponderConsulta } from "./asistencia/application/useCase/ResponderConsulta";
import type { ProveedorLLM } from "./shared/llm/application/port/ProveedorLLM";
import { configurarProveedorLLM } from "./shared/llm/infrastructure/ConfigurarProveedor";
import { ErrorStore } from "./store";

/**
 * API local de proyectos. La UI nunca toca el filesystem: todo pasa por aquí.
 * `base` se inyecta para que las pruebas usen un directorio temporal.
 */

export interface OpcionesApp {
  /**
   * Proveedor LLM del asistente. Sin especificar se resuelve de la
   * configuración (SALMAN_LLM) al primer uso; `null` desactiva el asistente
   * (útil en pruebas).
   */
  llm?: ProveedorLLM | null;
}
export function crearApp(base: string, opciones: OpcionesApp = {}): Hono {
  const app = new Hono();
  const repositorio = new ProyectoFileSystemRepository(base);
  const compilador = new CompiladorHtml();
  const crearProyecto = new CrearProyectoImpl(repositorio, catalogoScaffolds);
  const listarProyectos = new ListarProyectosImpl(repositorio);
  const obtenerProyecto = new ObtenerProyectoImpl(repositorio);
  const guardarProyecto = new GuardarProyectoImpl(repositorio);
  const compilarProyecto = new CompilarProyectoImpl(repositorio, compilador);
  const subirRecurso = new SubirRecursoImpl(repositorio);
  const listarRecursos = new ListarRecursosImpl(repositorio);
  const obtenerRecurso = new ObtenerRecursoImpl(repositorio);

  // El proveedor se resuelve perezosamente para que el servidor arranque
  // sin credenciales: el error se informa al usar el asistente, no antes.
  let llm = opciones.llm;
  let responderConsulta: ResponderConsulta | null | undefined;
  let errorLLM: string | null = null;
  const obtenerResponderConsulta = (): ResponderConsulta | null => {
    if (responderConsulta !== undefined) return responderConsulta;
    if (llm === undefined) {
      try {
        llm = configurarProveedorLLM();
      } catch (error) {
        llm = null;
        errorLLM = (error as Error).message;
      }
    }
    responderConsulta = llm
      ? new ResponderConsultaImpl(repositorio, llm, serializadorPrompt)
      : null;
    return responderConsulta;
  };

  app.onError((err, c) => {
    if (err instanceof ErrorStore) {
      return c.json(
        { error: err.message },
        err.codigo === "no-existe" ? 404 : 400,
      );
    }
    if (err instanceof z.ZodError) {
      return c.json({ error: "Documento inválido", detalles: err.issues }, 400);
    }
    console.error(err);
    return c.json({ error: "Error interno" }, 500);
  });

  app.route(
    "/",
    crearRutasClases({
      crearProyecto,
      listarProyectos,
      obtenerProyecto,
      guardarProyecto,
      compilarProyecto,
      listarScaffolds: () => catalogoScaffolds.listar(),
    }),
  );
  app.route(
    "/",
    crearRutasRecursos({
      subirRecurso,
      listarRecursos,
      obtenerRecurso,
    }),
  );
  app.route(
    "/",
    crearRutasAsistencia({
      obtenerResponderConsulta,
      obtenerErrorConfiguracion: () =>
        errorLLM ?? MENSAJE_ASISTENTE_NO_CONFIGURADO,
    }),
  );

  return app;
}
