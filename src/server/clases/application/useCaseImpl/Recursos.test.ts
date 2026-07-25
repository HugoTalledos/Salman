import { describe, expect, it } from "vitest";
import type { ProyectoRepository } from "../../domain/repository/ProyectoRepository";
import { ListarRecursosImpl } from "./ListarRecursosImpl";
import { ObtenerRecursoImpl } from "./ObtenerRecursoImpl";
import { SubirRecursoImpl } from "./SubirRecursoImpl";

function crearRepositorio(
  cambios: Partial<ProyectoRepository> = {},
): ProyectoRepository {
  return {
    listar: async () => [],
    obtener: async () => {
      throw new Error("No implementado");
    },
    crear: async () => "",
    guardar: async () => undefined,
    borrar: async () => undefined,
    escribirRecurso: async () => undefined,
    escribirRecursoUnico: async (_carpeta, nombre) => nombre,
    listarRecursos: async () => [],
    leerRecurso: async () => new Uint8Array(),
    ...cambios,
  };
}

describe("SubirRecursoImpl", () => {
  it("sanea el tallo del nombre y conserva una extensión permitida", async () => {
    let nombreEscrito = "";
    const repositorio = crearRepositorio({
      escribirRecursoUnico: async (_carpeta, nombre) => {
        nombreEscrito = nombre;
        return nombre;
      },
    });
    const subir = new SubirRecursoImpl(repositorio);

    const resultado = await subir.ejecutar({
      carpeta: "Fracciones",
      nombre: "Mapa:/\\\0   del ciclo.png",
      tipo: "image/png",
      datos: new Uint8Array([137, 80, 78, 71]),
    });

    expect(nombreEscrito).toBe("Mapa del ciclo.png");
    expect(resultado).toEqual({ recurso: "recursos/Mapa del ciclo.png" });
  });

  it("reproduce el saneamiento de nombreCarpeta sin recortar tras quitar puntos", async () => {
    let nombreEscrito = "";
    const repositorio = crearRepositorio({
      escribirRecursoUnico: async (_carpeta, nombre) => {
        nombreEscrito = nombre;
        return nombre;
      },
    });
    const subir = new SubirRecursoImpl(repositorio);

    await subir.ejecutar({
      carpeta: "Fracciones",
      nombre: "... mapa.png",
      tipo: "image/png",
      datos: new Uint8Array(),
    });

    expect(nombreEscrito).toBe(" mapa.png");
  });

  it.each(["png", "jpg", "jpeg", "gif", "webp", "svg"])(
    "permite archivos .%s",
    async (extension) => {
      const subir = new SubirRecursoImpl(crearRepositorio());

      await expect(
        subir.ejecutar({
          carpeta: "Fracciones",
          nombre: `recurso.${extension}`,
          tipo: "application/octet-stream",
          datos: new Uint8Array(),
        }),
      ).resolves.toEqual({ recurso: `recursos/recurso.${extension}` });
    },
  );

  it("rechaza extensiones que no están permitidas", async () => {
    const subir = new SubirRecursoImpl(crearRepositorio());

    await expect(
      subir.ejecutar({
        carpeta: "Fracciones",
        nombre: "apuntes.pdf",
        tipo: "application/pdf",
        datos: new Uint8Array(),
      }),
    ).rejects.toMatchObject({
      codigo: "extension",
      message: "La extensión del recurso no está permitida",
    });
  });

  it("distingue un nombre sin tallo de una extensión no permitida", async () => {
    const subir = new SubirRecursoImpl(crearRepositorio());

    await expect(
      subir.ejecutar({
        carpeta: "Fracciones",
        nombre: ".png",
        tipo: "image/png",
        datos: new Uint8Array(),
      }),
    ).rejects.toMatchObject({
      codigo: "nombre",
      message: "La extensión del recurso no está permitida",
    });
  });

  it("acepta exactamente 10 MiB y rechaza un byte adicional", async () => {
    const subir = new SubirRecursoImpl(crearRepositorio());
    const entrada = {
      carpeta: "Fracciones",
      nombre: "imagen.png",
      tipo: "image/png",
    };

    await expect(
      subir.ejecutar({
        ...entrada,
        datos: new Uint8Array(10 * 1024 * 1024),
      }),
    ).resolves.toEqual({ recurso: "recursos/imagen.png" });
    await expect(
      subir.ejecutar({
        ...entrada,
        datos: new Uint8Array(10 * 1024 * 1024 + 1),
      }),
    ).rejects.toMatchObject({
      codigo: "tamano",
      message: "El recurso excede el tamaño máximo de 10 MiB",
    });
  });

  it("delega la escritura única y devuelve el nombre asignado", async () => {
    const datos = new Uint8Array([1, 2, 3]);
    let escritura:
      | { carpeta: string; nombre: string; datos: Uint8Array }
      | undefined;
    const repositorio = crearRepositorio({
      escribirRecursoUnico: async (carpeta, nombre, contenido) => {
        escritura = { carpeta, nombre, datos: contenido };
        return "mapa-2.png";
      },
    });
    const subir = new SubirRecursoImpl(repositorio);

    const resultado = await subir.ejecutar({
      carpeta: "Fracciones",
      nombre: "mapa.png",
      tipo: "image/png",
      datos,
    });

    expect(escritura).toEqual({
      carpeta: "Fracciones",
      nombre: "mapa.png",
      datos,
    });
    expect(resultado).toEqual({ recurso: "recursos/mapa-2.png" });
  });
});

describe("ListarRecursosImpl", () => {
  it("lista los recursos de la carpeta indicada", async () => {
    const repositorio = crearRepositorio({
      listarRecursos: async (carpeta) =>
        carpeta === "Fracciones" ? ["mapa.png", "ciclo.svg"] : [],
    });
    const listar = new ListarRecursosImpl(repositorio);

    await expect(listar.ejecutar("Fracciones")).resolves.toEqual([
      "mapa.png",
      "ciclo.svg",
    ]);
  });
});

describe("ObtenerRecursoImpl", () => {
  it.each([
    ["pagina.html", "text/html; charset=utf-8"],
    ["imagen.png", "image/png"],
    ["foto.jpg", "image/jpeg"],
    ["foto.jpeg", "image/jpeg"],
    ["animacion.gif", "image/gif"],
    ["lamina.webp", "image/webp"],
    ["vector.svg", "image/svg+xml"],
    ["guia.pdf", "application/pdf"],
    ["datos.bin", "application/octet-stream"],
  ])("lee %s y devuelve su MIME %s", async (nombre, tipoContenido) => {
    const datos = new Uint8Array([4, 5, 6]);
    const repositorio = crearRepositorio({
      leerRecurso: async () => datos,
    });
    const obtener = new ObtenerRecursoImpl(repositorio);

    await expect(
      obtener.ejecutar("Fracciones", nombre),
    ).resolves.toEqual({ datos, tipoContenido });
  });
});
