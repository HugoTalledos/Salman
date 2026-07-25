import { describe, expect, it } from "vitest";
import type { Bloque } from "../server/clases/domain/entity/Clase";
import { crearClase } from "../server/clases/domain/service/CrearClase";
import { catalogoScaffolds } from "../server/clases/infrastructure/scaffold/CatalogoScaffolds";
import { claseEjemplo } from "../testing/fixtures";
import { type BloqueEditor, claseDesdeEditor, editorDesdeClase } from "./mapeo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("editorDesdeClase", () => {
  it("mapea una fase con sus hijos, target y duración", () => {
    const [fase] = editorDesdeClase(claseEjemplo.bloques);
    expect(fase).toMatchObject({
      id: claseEjemplo.bloques[0].id,
      type: "fase",
      props: { target: "ambos", duracionMinutos: 10 },
      content: [{ type: "text", text: "Inicio", styles: {} }],
    });
    expect(fase.children).toHaveLength(2);
    expect(fase.children[0].type).toBe("nota");
    expect(fase.children[1].props.target).toBe("material");
  });

  it("convierte el markdown del contenido a runs con estilo", () => {
    const bloques: Bloque[] = [
      {
        id: claseEjemplo.id,
        tipo: "texto",
        target: "guia",
        contenido: "con **énfasis**",
      },
    ];
    expect(editorDesdeClase(bloques)[0].content).toEqual([
      { type: "text", text: "con ", styles: {} },
      { type: "text", text: "énfasis", styles: { bold: true } },
    ]);
  });
});

describe("viaje completo fuente → editor → fuente", () => {
  it("preserva la clase de ejemplo sin pérdida", () => {
    expect(claseDesdeEditor(editorDesdeClase(claseEjemplo.bloques))).toEqual(
      claseEjemplo.bloques,
    );
  });

  it("preserva la semilla del scaffold real (markdown con formato y listas)", () => {
    const semilla = crearClase(
      "Prueba",
      catalogoScaffolds.obtener("inicio-desarrollo-cierre")!,
    ).bloques;
    expect(claseDesdeEditor(editorDesdeClase(semilla))).toEqual(semilla);
  });
});

describe("claseDesdeEditor normaliza lo que el fuente no admite", () => {
  const texto = (id: string, extra?: Partial<BloqueEditor>): BloqueEditor => ({
    id,
    type: "texto",
    props: { target: "ambos" },
    content: [{ type: "text", text: `bloque ${id}`, styles: {} }],
    children: [],
    ...extra,
  });
  const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

  it("un tipo desconocido del editor se guarda como texto (nunca se pierde)", () => {
    const [bloque] = claseDesdeEditor([
      { ...texto(id(1)), type: "paragraph", props: {} },
    ]);
    expect(bloque).toMatchObject({ tipo: "texto", target: "ambos", contenido: "bloque " + id(1) });
  });

  it("una fase anidada dentro de otra sube al nivel superior", () => {
    const faseInterna: BloqueEditor = {
      id: id(2),
      type: "fase",
      props: { target: "ambos", duracionMinutos: 0 },
      content: [{ type: "text", text: "Interna", styles: {} }],
      children: [texto(id(3))],
    };
    const faseExterna: BloqueEditor = {
      id: id(4),
      type: "fase",
      props: { target: "guia", duracionMinutos: 5 },
      content: [{ type: "text", text: "Externa", styles: {} }],
      children: [texto(id(5)), faseInterna],
    };
    const resultado = claseDesdeEditor([faseExterna]);
    expect(resultado.map((b) => b.tipo)).toEqual(["fase", "fase"]);
    expect(resultado[0]).toMatchObject({ titulo: "Externa", duracionMinutos: 5 });
    expect((resultado[0] as { bloques: unknown[] }).bloques).toHaveLength(1);
    expect(resultado[1]).toMatchObject({ titulo: "Interna" });
    expect((resultado[1] as { bloques: unknown[] }).bloques).toHaveLength(1);
  });

  it("los hijos de un bloque hoja se aplanan como hermanos dentro de la fase", () => {
    const fase: BloqueEditor = {
      id: id(6),
      type: "fase",
      props: { target: "ambos", duracionMinutos: 0 },
      content: [{ type: "text", text: "Fase", styles: {} }],
      children: [texto(id(7), { children: [texto(id(8))] })],
    };
    const [resultado] = claseDesdeEditor([fase]);
    expect((resultado as { bloques: unknown[] }).bloques).toHaveLength(2);
  });

  it("regenera IDs que no son UUID y targets inválidos", () => {
    const [bloque] = claseDesdeEditor([
      { ...texto("id-de-blocknote"), props: { target: "pizarra" } },
    ]);
    expect(bloque.id).toMatch(UUID);
    expect(bloque.target).toBe("ambos");
  });

  it("una imagen sin recurso todavía no llega al fuente", () => {
    const imagen: BloqueEditor = {
      id: id(9),
      type: "imagen",
      props: { target: "material", recurso: "", alt: "", pie: "" },
      children: [],
    };
    expect(claseDesdeEditor([imagen])).toEqual([]);
  });

  it("una nota siempre sale con target guia", () => {
    const [bloque] = claseDesdeEditor([
      { ...texto(id(1)), type: "nota", props: { target: "material" } },
    ]);
    expect(bloque).toMatchObject({ tipo: "nota", target: "guia" });
  });
});
