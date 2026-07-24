// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccionAsistente } from "../asistente/acciones";
import { AccionesAsistente } from "./AccionesAsistente";

afterEach(cleanup);

const acciones: readonly AccionAsistente[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    titulo: "Abrir con una pregunta",
    beneficio: "Activa los conocimientos previos.",
    ubicacion: {
      tipo: "fase",
      faseId: "20000000-0000-4000-8000-000000000001",
      posicion: "final",
    },
    bloques: [
      {
        id: "30000000-0000-4000-8000-000000000001",
        tipo: "texto",
        target: "ambos",
        contenido: "¿Qué sabemos ya sobre el tema?",
      },
      {
        id: "30000000-0000-4000-8000-000000000002",
        tipo: "nota",
        target: "guia",
        contenido: "Escucha dos respuestas antes de continuar.",
      },
    ],
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    titulo: "Crear una práctica guiada",
    beneficio: "Da tiempo para ensayar la habilidad.",
    ubicacion: {
      tipo: "fase",
      faseId: "20000000-0000-4000-8000-000000000001",
      posicion: "inicio",
    },
    bloques: [
      {
        id: "30000000-0000-4000-8000-000000000003",
        tipo: "texto",
        target: "material",
        contenido: "Resuelve el primer ejemplo en parejas.",
      },
    ],
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    titulo: "Cerrar con una síntesis",
    beneficio: "Consolida lo aprendido.",
    ubicacion: {
      tipo: "raiz",
      anclaId: "20000000-0000-4000-8000-000000000002",
      posicion: "despues",
    },
    bloques: [
      {
        id: "30000000-0000-4000-8000-000000000004",
        tipo: "fase",
        target: "ambos",
        titulo: "Cierre",
        duracionMinutos: 5,
        bloques: [],
      },
    ],
  },
];

function renderizar(opciones?: {
  describir?: (accion: AccionAsistente) => string | null;
  aplicar?: (accion: AccionAsistente) => { ok: true } | { ok: false; error: string };
}) {
  const aplicar = vi.fn(opciones?.aplicar ?? (() => ({ ok: true } as const)));
  render(
    <AccionesAsistente
      acciones={acciones}
      describir={opciones?.describir ?? (() => "Al final de la fase «Inicio»")}
      aplicar={aplicar}
    />,
  );
  return aplicar;
}

describe("AccionesAsistente", () => {
  it("previsualiza una propuesta y aplica solo la acción confirmada", async () => {
    const user = userEvent.setup();
    const aplicar = renderizar();

    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Ver propuesta" })).toHaveLength(3);

    await user.click(screen.getAllByRole("button", { name: "Ver propuesta" })[0]);

    expect(screen.getByText("Al final de la fase «Inicio»")).not.toBeNull();
    expect(screen.getByText("texto · ambos")).not.toBeNull();
    expect(screen.getByText("¿Qué sabemos ya sobre el tema?")).not.toBeNull();
    expect(screen.getByText("nota · guia")).not.toBeNull();
    expect(aplicar).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Agregar al documento" }));

    expect(aplicar).toHaveBeenCalledWith(acciones[0]);
    expect(screen.getByText("Agregada")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Agregar al documento" })).toBeNull();
    expect(
      (screen.getAllByRole("button", { name: "Ver propuesta" })[1] as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("cierra la vista previa al cancelar sin aplicar la propuesta", async () => {
    const user = userEvent.setup();
    const aplicar = renderizar();

    await user.click(screen.getAllByRole("button", { name: "Ver propuesta" })[1]);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("button", { name: "Agregar al documento" })).toBeNull();
    expect(aplicar).not.toHaveBeenCalled();
  });

  it("muestra un error y no ofrece confirmación cuando el ancla ya no existe", async () => {
    const user = userEvent.setup();
    const aplicar = renderizar({
      describir: (accion) => accion.id === acciones[2].id ? null : "Al final de la fase «Inicio»",
    });

    await user.click(screen.getAllByRole("button", { name: "Ver propuesta" })[2]);

    expect(screen.getByRole("alert")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Agregar al documento" })).toBeNull();
    expect(aplicar).not.toHaveBeenCalled();
  });

  it("mantiene la vista previa abierta y comunica un error de aplicación", async () => {
    const user = userEvent.setup();
    const aplicar = renderizar({
      aplicar: () => ({ ok: false, error: "La propuesta ya no es válida." }),
    });

    await user.click(screen.getAllByRole("button", { name: "Ver propuesta" })[0]);
    await user.click(screen.getByRole("button", { name: "Agregar al documento" }));

    expect(screen.getByText("La propuesta ya no es válida.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Agregar al documento" })).not.toBeNull();
    expect(aplicar).toHaveBeenCalledWith(acciones[0]);
  });
});
