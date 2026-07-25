import { describe, expect, it } from "vitest";
import { claseEjemplo } from "../../../../testing/fixtures";
import type { ClaseSalman } from "../../domain/entity/Clase";
import type {
  ProyectoRepository,
  ResumenProyecto,
} from "../../domain/repository/ProyectoRepository";
import type {
  CompiladorClase,
  TargetCompilacion,
} from "../../domain/service/CompiladorClase";
import { CompilarProyectoImpl } from "./CompilarProyectoImpl";

class RepositorioFake implements ProyectoRepository {
  carpetasObtenidas: string[] = [];
  recursosEscritos: Array<{ carpeta: string; nombre: string; datos: string }> = [];

  async obtener(carpeta: string): Promise<ClaseSalman> {
    this.carpetasObtenidas.push(carpeta);
    return claseEjemplo;
  }

  async escribirRecurso(
    carpeta: string,
    nombre: string,
    datos: string | Uint8Array,
  ): Promise<void> {
    if (typeof datos !== "string") throw new Error("Se esperaba HTML");
    this.recursosEscritos.push({ carpeta, nombre, datos });
  }

  async listar(): Promise<ResumenProyecto[]> {
    throw new Error("No esperado");
  }

  async crear(): Promise<string> {
    throw new Error("No esperado");
  }

  async guardar(): Promise<void> {
    throw new Error("No esperado");
  }

  async borrar(): Promise<void> {}

  async escribirRecursoUnico(): Promise<string> {
    throw new Error("No esperado");
  }

  async listarRecursos(): Promise<string[]> {
    throw new Error("No esperado");
  }

  async leerRecurso(): Promise<Uint8Array> {
    throw new Error("No esperado");
  }
}

class CompiladorFake implements CompiladorClase {
  compilaciones: Array<{ clase: ClaseSalman; target: TargetCompilacion }> = [];

  compilar(clase: ClaseSalman, target: TargetCompilacion): string {
    this.compilaciones.push({ clase, target });
    return `html-${target}`;
  }
}

describe("CompilarProyectoImpl", () => {
  it("lee una vez, compila ambos targets y escribe sus nombres exactos", async () => {
    const repositorio = new RepositorioFake();
    const compilador = new CompiladorFake();
    const casoDeUso = new CompilarProyectoImpl(repositorio, compilador);

    const resultado = await casoDeUso.ejecutar("mi-clase");

    expect(repositorio.carpetasObtenidas).toEqual(["mi-clase"]);
    expect(compilador.compilaciones).toEqual([
      { clase: claseEjemplo, target: "guia" },
      { clase: claseEjemplo, target: "material" },
    ]);
    expect(repositorio.recursosEscritos).toEqual([
      {
        carpeta: "mi-clase",
        nombre: "guia-del-profesor.html",
        datos: "html-guia",
      },
      {
        carpeta: "mi-clase",
        nombre: "material-del-alumno.html",
        datos: "html-material",
      },
    ]);
    expect(resultado).toEqual({
      archivos: {
        guia: "guia-del-profesor.html",
        material: "material-del-alumno.html",
      },
    });
  });
});
