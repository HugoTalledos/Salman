// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Inicio } from "./Inicio";
import { api } from "./api";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const proyectos = [{
  carpeta: "Fracciones",
  titulo: "Fracciones",
  modificado: "2026-07-25T10:00:00.000Z",
  scaffold: null,
}];

function renderizarInicio() {
  vi.spyOn(api, "listarProyectos").mockResolvedValue(proyectos);
  vi.spyOn(api, "listarScaffolds").mockResolvedValue([]);
  render(<Inicio alAbrir={vi.fn()} />);
}

function promesaDiferida() {
  let resolver!: () => void;
  const promesa = new Promise<void>((resolve) => {
    resolver = resolve;
  });
  return { promesa, resolver };
}

describe("Inicio", () => {
  it("abre el diálogo para la clase elegida y cancelar la conserva", async () => {
    const user = userEvent.setup();
    renderizarInicio();
    await screen.findByText("Fracciones");

    await user.click(screen.getByRole("button", { name: "Borrar clase Fracciones" }));

    const dialogo = screen.getByRole("dialog");
    expect(dialogo).not.toBeNull();
    expect(screen.getByText("¿Borrar “Fracciones”?"))
      .not.toBeNull();
    expect(screen.getByText(
      "Esta acción eliminará la clase y sus recursos asociados, y no se puede deshacer.",
    )).not.toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(dialogo));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Fracciones")).not.toBeNull();
  });

  it("confirma el borrado y retira la clase del listado", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "borrarProyecto").mockResolvedValue();
    renderizarInicio();
    await screen.findByText("Fracciones");

    await user.click(screen.getByRole("button", { name: "Borrar clase Fracciones" }));
    await user.click(screen.getByRole("button", { name: /^Borrar$/ }));

    await waitFor(() => expect(api.borrarProyecto).toHaveBeenCalledWith("Fracciones"));
    expect(screen.queryByText("Fracciones")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("conserva el diálogo y la clase cuando el borrado falla", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "borrarProyecto").mockRejectedValue(new Error("No se pudo borrar"));
    renderizarInicio();
    await screen.findByText("Fracciones");

    await user.click(screen.getByRole("button", { name: "Borrar clase Fracciones" }));
    await user.click(screen.getByRole("button", { name: /^Borrar$/ }));

    expect(await screen.findByText("No se pudo borrar")).not.toBeNull();
    expect(screen.getByRole("dialog")).not.toBeNull();
    expect(screen.getByText("Fracciones")).not.toBeNull();
  });

  it("cierra un diálogo inactivo con Escape", async () => {
    const user = userEvent.setup();
    renderizarInicio();
    await screen.findByText("Fracciones");

    await user.click(screen.getByRole("button", { name: "Borrar clase Fracciones" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("deshabilita confirmar y cancelar mientras el borrado está pendiente", async () => {
    const user = userEvent.setup();
    const diferida = promesaDiferida();
    vi.spyOn(api, "borrarProyecto").mockReturnValue(diferida.promesa);
    renderizarInicio();
    await screen.findByText("Fracciones");

    await user.click(screen.getByRole("button", { name: "Borrar clase Fracciones" }));
    await user.click(screen.getByRole("button", { name: /^Borrar$/ }));

    await waitFor(() => expect(api.borrarProyecto).toHaveBeenCalledWith("Fracciones"));
    expect((screen.getByRole("button", { name: /^Borrar$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("dialog")).not.toBeNull();

    diferida.resolver();
  });
});
