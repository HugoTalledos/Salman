import { describe, expect, it } from "vitest";
import { claseEjemplo } from "../../../../testing/fixtures";
import type { ClaseSalman } from "../../domain/entity/Clase";
import type { DefinicionScaffold } from "../../domain/entity/Scaffold";
import { ScaffoldNoExiste } from "../../domain/error/ErroresProyecto";
import type {
  ProyectoRepository,
  ResumenProyecto,
} from "../../domain/repository/ProyectoRepository";
import type { CatalogoScaffolds } from "../port/CatalogoScaffolds";
import { BorrarProyectoImpl } from "./BorrarProyectoImpl";
import { CrearProyectoImpl } from "./CrearProyectoImpl";
import { GuardarProyectoImpl } from "./GuardarProyectoImpl";
import { ListarProyectosImpl } from "./ListarProyectosImpl";
import { ObtenerProyectoImpl } from "./ObtenerProyectoImpl";

const scaffoldEjemplo: DefinicionScaffold = {
  id: "inicio-desarrollo-cierre",
  nombre: "Inicio / Desarrollo / Cierre",
  version: 1,
  descripcion: "Estructura una clase en tres fases.",
  semilla: () => [],
};

class RepositorioFake implements ProyectoRepository {
  creada: ClaseSalman | undefined;
  guardada: { carpeta: string; clase: ClaseSalman } | undefined;
  carpetaObtenida: string | undefined;
  carpetaBorrada: string | undefined;
  listarLlamado = false;
  private readonly resumenes: ResumenProyecto[];
  private readonly clase: ClaseSalman;

  constructor(
    resumenes: ResumenProyecto[] = [],
    clase: ClaseSalman = claseEjemplo,
  ) {
    this.resumenes = resumenes;
    this.clase = clase;
  }

  async listar(): Promise<ResumenProyecto[]> {
    this.listarLlamado = true;
    return this.resumenes;
  }

  async obtener(carpeta: string): Promise<ClaseSalman> {
    this.carpetaObtenida = carpeta;
    return this.clase;
  }

  async crear(clase: ClaseSalman): Promise<string> {
    this.creada = clase;
    return clase.titulo;
  }

  async guardar(carpeta: string, clase: ClaseSalman): Promise<void> {
    this.guardada = { carpeta, clase };
  }

  async borrar(carpeta: string): Promise<void> {
    this.carpetaBorrada = carpeta;
  }

  async escribirRecurso(): Promise<void> {}

  async escribirRecursoUnico(): Promise<string> {
    return "recurso";
  }

  async listarRecursos(): Promise<string[]> {
    return [];
  }

  async leerRecurso(): Promise<Uint8Array> {
    return new Uint8Array();
  }
}

function catalogoFake(scaffold: DefinicionScaffold | undefined): CatalogoScaffolds {
  return {
    listar: () => (scaffold ? [scaffold] : []),
    obtener: (id) => (id === scaffold?.id ? scaffold : undefined),
  };
}

describe("CrearProyectoImpl", () => {
  it("crea y persiste una clase desde el scaffold solicitado", async () => {
    const repositorio = new RepositorioFake();
    const crearProyecto = new CrearProyectoImpl(repositorio, catalogoFake(scaffoldEjemplo));
    const metadatos = {
      materia: "Matemáticas",
      grado: "5.º",
      objetivos: ["Comparar fracciones"],
    };

    const proyecto = await crearProyecto.ejecutar({
      titulo: "Fracciones",
      scaffoldId: "inicio-desarrollo-cierre",
      metadatos,
    });

    expect(proyecto.carpeta).toBe("Fracciones");
    expect(proyecto.clase.titulo).toBe("Fracciones");
    expect(proyecto.clase.scaffold).toMatchObject({ id: "inicio-desarrollo-cierre" });
    expect(proyecto.clase.metadatos).toEqual(metadatos);
    expect(repositorio.creada).toEqual(proyecto.clase);
  });

  it("crea y persiste una clase libre", async () => {
    const repositorio = new RepositorioFake();
    const crearProyecto = new CrearProyectoImpl(repositorio, catalogoFake(scaffoldEjemplo));

    const proyecto = await crearProyecto.ejecutar({
      titulo: "Libre",
      scaffoldId: null,
      metadatos: {},
    });

    expect(proyecto).toMatchObject({
      carpeta: "Libre",
      clase: { titulo: "Libre", scaffold: null, bloques: [] },
    });
    expect(repositorio.creada).toEqual(proyecto.clase);
  });

  it("rechaza un scaffold que el catálogo no reconoce", async () => {
    const crearProyecto = new CrearProyectoImpl(
      new RepositorioFake(),
      catalogoFake(undefined),
    );

    await expect(
      crearProyecto.ejecutar({
        titulo: "Fracciones",
        scaffoldId: "desconocido",
        metadatos: {},
      }),
    ).rejects.toBeInstanceOf(ScaffoldNoExiste);
  });

  it("rechaza un identificador de scaffold vacío", async () => {
    const crearProyecto = new CrearProyectoImpl(
      new RepositorioFake(),
      catalogoFake(undefined),
    );

    await expect(
      crearProyecto.ejecutar({ titulo: "Fracciones", scaffoldId: "", metadatos: {} }),
    ).rejects.toBeInstanceOf(ScaffoldNoExiste);
  });
});

describe("GuardarProyectoImpl", () => {
  it("actualiza modificado antes de persistir la clase", async () => {
    const repositorio = new RepositorioFake();
    const guardarProyecto = new GuardarProyectoImpl(repositorio);
    const clase = { ...claseEjemplo, modificado: "2020-01-01T00:00:00.000Z" };

    const guardada = await guardarProyecto.ejecutar({ carpeta: "Libre", clase });

    expect(Date.parse(guardada.modificado)).toBeGreaterThan(Date.parse(clase.modificado));
    expect(repositorio.guardada).toEqual({ carpeta: "Libre", clase: guardada });
  });
});

describe("BorrarProyectoImpl", () => {
  it("delega el borrado de la carpeta solicitada", async () => {
    const repositorio = new RepositorioFake();

    await new BorrarProyectoImpl(repositorio).ejecutar("Fracciones");

    expect(repositorio.carpetaBorrada).toBe("Fracciones");
  });
});

describe("ListarProyectosImpl y ObtenerProyectoImpl", () => {
  it("devuelve los resúmenes del repositorio", async () => {
    const resumenes: ResumenProyecto[] = [
      {
        carpeta: "Fracciones",
        titulo: "Fracciones",
        modificado: "2026-07-25T12:00:00.000Z",
        scaffold: "Inicio / Desarrollo / Cierre",
      },
    ];
    const repositorio = new RepositorioFake(resumenes);

    await expect(new ListarProyectosImpl(repositorio).ejecutar()).resolves.toEqual(resumenes);
    expect(repositorio.listarLlamado).toBe(true);
  });

  it("devuelve la clase obtenida de la carpeta solicitada", async () => {
    const repositorio = new RepositorioFake();

    await expect(new ObtenerProyectoImpl(repositorio).ejecutar("Fracciones")).resolves.toEqual(
      claseEjemplo,
    );
    expect(repositorio.carpetaObtenida).toBe("Fracciones");
  });
});
