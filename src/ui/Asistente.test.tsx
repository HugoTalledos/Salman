// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RespuestaAsistente } from "../asistente/acciones";
import type { BloqueEditor } from "../mapping/mapeo";
import { Asistente } from "./Asistente";
import { api } from "./api";

Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const respuestaAccionable: RespuestaAsistente = {
  tipo: "accionable",
  mensaje: "Puedo añadir un cierre breve.",
  acciones: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      titulo: "Añadir síntesis",
      beneficio: "Consolida lo aprendido.",
      ubicacion: {
        tipo: "fase",
        faseId: "20000000-0000-4000-8000-000000000001",
        posicion: "final",
      },
      bloques: [{
        id: "30000000-0000-4000-8000-000000000001",
        tipo: "texto",
        target: "ambos",
        contenido: "Resume la idea principal.",
      }],
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      titulo: "Añadir salida",
      beneficio: "Comprueba la comprensión.",
      ubicacion: {
        tipo: "fase",
        faseId: "20000000-0000-4000-8000-000000000001",
        posicion: "final",
      },
      bloques: [{
        id: "30000000-0000-4000-8000-000000000002",
        tipo: "texto",
        target: "material",
        contenido: "Escribe una duda pendiente.",
      }],
    },
    {
      id: "10000000-0000-4000-8000-000000000003",
      titulo: "Añadir reflexión",
      beneficio: "Promueve metacognición.",
      ubicacion: {
        tipo: "fase",
        faseId: "20000000-0000-4000-8000-000000000001",
        posicion: "inicio",
      },
      bloques: [{
        id: "30000000-0000-4000-8000-000000000003",
        tipo: "nota",
        target: "guia",
        contenido: "Pregunta qué estrategia resultó útil.",
      }],
    },
  ],
};

const documento: BloqueEditor[] = [{
  id: "20000000-0000-4000-8000-000000000001",
  type: "fase",
  props: { target: "ambos", duracionMinutos: 10 },
  content: [{ type: "text", text: "Cierre", styles: {} }],
  children: [],
}];

function renderizarAsistente() {
  const aplicarAccionDocumento = vi.fn(() => ({ ok: true } as const));
  const limpiarAdjuntos = vi.fn();
  render(
    <Asistente
      carpeta="mi-clase"
      adjuntos={[]}
      quitarAdjunto={vi.fn()}
      limpiarAdjuntos={limpiarAdjuntos}
      documentoActual={() => documento}
      aplicarAccionDocumento={aplicarAccionDocumento}
    />,
  );
  return { aplicarAccionDocumento, limpiarAdjuntos };
}

describe("Asistente", () => {
  it("muestra acciones estructuradas y solo reenvía al historial su mensaje legible", async () => {
    const user = userEvent.setup();
    const asistente = vi.spyOn(api, "asistente")
      .mockResolvedValueOnce(respuestaAccionable)
      .mockResolvedValueOnce({ tipo: "informativa", mensaje: "De acuerdo." });
    renderizarAsistente();

    const entrada = screen.getByRole("textbox", { name: "Mensaje para el asistente" });
    await user.type(entrada, "Propón un cierre");
    await user.click(screen.getByTitle("Enviar"));

    expect(await screen.findByText("Puedo añadir un cierre breve.")).not.toBeNull();
    expect(screen.getByRole("region", { name: "Propuestas del asistente" })).not.toBeNull();
    expect(screen.queryByText(JSON.stringify(respuestaAccionable))).toBeNull();

    await user.type(entrada, "Gracias");
    await user.click(screen.getByTitle("Enviar"));
    await waitFor(() => expect(asistente).toHaveBeenCalledTimes(2));

    expect(asistente.mock.calls[1][1]).toEqual([
      { rol: "usuario", contenido: "Propón un cierre" },
      { rol: "asistente", contenido: "Puedo añadir un cierre breve." },
      { rol: "usuario", contenido: "Gracias" },
    ]);
  });

  it("aplica la acción elegida contra el callback del editor", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "asistente").mockResolvedValueOnce(respuestaAccionable);
    const { aplicarAccionDocumento } = renderizarAsistente();

    await user.type(
      screen.getByRole("textbox", { name: "Mensaje para el asistente" }),
      "Propón un cierre",
    );
    await user.click(screen.getByTitle("Enviar"));
    await screen.findByText("Puedo añadir un cierre breve.");
    await user.click(screen.getAllByRole("button", { name: "Ver propuesta" })[0]);
    await user.click(screen.getByRole("button", { name: "Agregar al documento" }));

    expect(aplicarAccionDocumento).toHaveBeenCalledOnce();
    expect(aplicarAccionDocumento).toHaveBeenCalledWith(
      respuestaAccionable.acciones[0],
    );
  });
});
