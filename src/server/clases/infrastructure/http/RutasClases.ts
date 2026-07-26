import { Hono, type ErrorHandler } from "hono";
import { z } from "zod";
import type { BorrarProyecto } from "../../application/useCase/BorrarProyecto";
import type { CompilarProyecto } from "../../application/useCase/CompilarProyecto";
import type { CrearProyecto } from "../../application/useCase/CrearProyecto";
import type { GuardarProyecto } from "../../application/useCase/GuardarProyecto";
import type { ListarProyectos } from "../../application/useCase/ListarProyectos";
import type { ObtenerProyecto } from "../../application/useCase/ObtenerProyecto";
import type { CatalogoMetadatosClase } from "../../application/port/CatalogoMetadatosClase";
import { ClaseSalman } from "../../domain/entity/Clase";
import {
  NombreProyectoInvalido,
  ProyectoNoExiste,
  RecursoNoExiste,
  ScaffoldNoExiste,
} from "../../domain/error/ErroresProyecto";
import { RecursoInvalido } from "../../domain/error/RecursoInvalido";

function crearEsquemaMetadatos(catalogo: CatalogoMetadatosClase) {
  return z.object({
    materia: z.string().trim().min(1),
    grado: z.string().trim().min(1),
    objetivos: z.array(z.string()),
  }).superRefine(({ materia, grado, objetivos }, ctx) => {
    if (!catalogo.listarMaterias().includes(materia)) {
      ctx.addIssue({
        code: "custom",
        path: ["materia"],
        message: "Materia desconocida",
      });
    }
    if (!catalogo.listarGrados().includes(grado)) {
      ctx.addIssue({
        code: "custom",
        path: ["grado"],
        message: "Grado desconocido",
      });
    }

    const normalizados = objetivos.map((objetivo) => objetivo.trim());
    if (normalizados.some((objetivo) => objetivo.length === 0)) {
      ctx.addIssue({ code: "custom", message: "Los objetivos no pueden estar vacíos" });
    }
    if (new Set(normalizados).size !== normalizados.length) {
      ctx.addIssue({ code: "custom", message: "Los objetivos no pueden repetirse" });
    }
  }).transform(({ materia, grado, objetivos }) => ({
    materia,
    grado,
    objetivos: objetivos.map((objetivo) => objetivo.trim()),
  }));
}

function crearCuerpoCrear(catalogo: CatalogoMetadatosClase) {
  return z.object({
    titulo: z.string().trim().min(1, "El título es obligatorio"),
    scaffoldId: z.string().nullable(),
    metadatos: crearEsquemaMetadatos(catalogo),
  });
}

function crearConsultaObjetivos(catalogo: CatalogoMetadatosClase) {
  return z.object({
    materia: z.string().trim().min(1),
    grado: z.string().trim().optional(),
    titulo: z.string().trim().optional(),
  }).superRefine((consulta, ctx) => {
    if (!catalogo.listarObjetivos(consulta)) {
      ctx.addIssue({
        code: "custom",
        path: ["materia"],
        message: "Materia desconocida",
      });
    }
  });
}

export interface ResumenScaffold {
  id: string;
  nombre: string;
  version: number;
  descripcion: string;
  modelo?: string;
  metodo?: string;
}

export interface DependenciasRutasClases {
  borrarProyecto: BorrarProyecto;
  crearProyecto: CrearProyecto;
  listarProyectos: ListarProyectos;
  obtenerProyecto: ObtenerProyecto;
  guardarProyecto: GuardarProyecto;
  compilarProyecto: CompilarProyecto;
  listarScaffolds(): readonly ResumenScaffold[];
  catalogoMetadatos: CatalogoMetadatosClase;
}

function mensajeRecursoInvalido(error: RecursoInvalido): string {
  switch (error.codigo) {
    case "extension":
    case "nombre":
      return "Solo se aceptan imágenes (.png, .jpg, .jpeg, .gif, .webp, .svg)";
    case "tamano":
      return "La imagen supera los 10 MB";
    default: {
      const codigoExhaustivo: never = error.codigo;
      return codigoExhaustivo;
    }
  }
}

function mensajeErrorHttp(error: Error): string {
  if (error instanceof ScaffoldNoExiste) {
    return error.message.replace(/^No existe el scaffold /, "Scaffold desconocido: ");
  }
  if (error instanceof RecursoInvalido) {
    return mensajeRecursoInvalido(error);
  }
  return error.message;
}

export const responderErrorHttp: ErrorHandler = (error, contexto) => {
  if (
    error instanceof ProyectoNoExiste ||
    error instanceof RecursoNoExiste
  ) {
    return contexto.json({ error: error.message }, 404);
  }
  if (
    error instanceof NombreProyectoInvalido ||
    error instanceof RecursoInvalido ||
    error instanceof ScaffoldNoExiste
  ) {
    return contexto.json({ error: mensajeErrorHttp(error) }, 400);
  }
  if (error instanceof z.ZodError) {
    return contexto.json(
      { error: "Documento inválido", detalles: error.issues },
      400,
    );
  }
  console.error(error);
  return contexto.json({ error: "Error interno" }, 500);
};

export function crearRutasClases(
  dependencias: DependenciasRutasClases,
): Hono {
  const rutas = new Hono();
  rutas.onError(responderErrorHttp);
  const cuerpoCrear = crearCuerpoCrear(dependencias.catalogoMetadatos);
  const consultaObjetivos = crearConsultaObjetivos(dependencias.catalogoMetadatos);

  rutas.get("/api/catalogos/clase", (contexto) => {
    return contexto.json({
      materias: dependencias.catalogoMetadatos.listarMaterias(),
      grados: dependencias.catalogoMetadatos.listarGrados(),
    });
  });

  rutas.get("/api/objetivos", (contexto) => {
    const consulta = consultaObjetivos.parse(contexto.req.query());
    const objetivos = dependencias.catalogoMetadatos.listarObjetivos(consulta);
    return contexto.json({ objetivos });
  });

  rutas.get("/api/scaffolds", (contexto) => {
    const scaffolds = dependencias.listarScaffolds().map(
      ({ id, nombre, version, descripcion, modelo, metodo }) => ({
        id,
        nombre,
        version,
        descripcion,
        modelo,
        metodo,
      }),
    );
    return contexto.json({ scaffolds });
  });

  rutas.get("/api/proyectos", async (contexto) => {
    const proyectos = await dependencias.listarProyectos.ejecutar();
    return contexto.json({ proyectos });
  });

  rutas.post("/api/proyectos", async (contexto) => {
    const entrada = cuerpoCrear.parse(await contexto.req.json());
    const proyecto = await dependencias.crearProyecto.ejecutar(entrada);
    return contexto.json(proyecto, 201);
  });

  rutas.get("/api/proyectos/:carpeta", async (contexto) => {
    const clase = await dependencias.obtenerProyecto.ejecutar(
      contexto.req.param("carpeta"),
    );
    return contexto.json({ clase });
  });

  rutas.delete("/api/proyectos/:carpeta", async (contexto) => {
    await dependencias.borrarProyecto.ejecutar(contexto.req.param("carpeta"));
    return contexto.body(null, 204);
  });

  rutas.post("/api/proyectos/:carpeta/compilar", async (contexto) => {
    const resultado = await dependencias.compilarProyecto.ejecutar(
      contexto.req.param("carpeta"),
    );
    return contexto.json(resultado);
  });

  rutas.put("/api/proyectos/:carpeta", async (contexto) => {
    const clase = ClaseSalman.parse(await contexto.req.json());
    const guardada = await dependencias.guardarProyecto.ejecutar({
      carpeta: contexto.req.param("carpeta"),
      clase,
    });
    return contexto.json({ clase: guardada });
  });

  return rutas;
}
