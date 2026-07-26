// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
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

const claseCreada = {
  formato: "salman" as const,
  version: 1 as const,
  id: "886a3294-0fe9-4d4a-8220-53060f236aa2",
  titulo: "Fracciones",
  metadatos: {
    materia: "Matemáticas",
    grado: "5.º",
    objetivos: [],
  },
  scaffold: null,
  creado: "2026-07-25T10:00:00.000Z",
  modificado: "2026-07-25T10:00:00.000Z",
  bloques: [],
};

function renderizarInicio(proyectosListados = proyectos) {
  vi.spyOn(api, "listarProyectos").mockResolvedValue(proyectosListados);
  vi.spyOn(api, "listarScaffolds").mockResolvedValue([]);
  vi.spyOn(api, "listarCatalogosClase").mockResolvedValue({
    materias: ["Matemáticas", "Ciencias"],
    grados: ["5.º", "6.º"],
  });
  vi.spyOn(api, "listarObjetivos").mockResolvedValue([
    "Resolver problemas aplicando conceptos matemáticos",
  ]);
  const alAbrir = vi.fn();
  render(<Inicio alAbrir={alAbrir} />);
  return { alAbrir };
}

function promesaDiferida() {
  let resolver!: () => void;
  const promesa = new Promise<void>((resolve) => {
    resolver = resolve;
  });
  return { promesa, resolver };
}

function promesaDiferidaConValor<T>() {
  let resolver!: (valor: T) => void;
  const promesa = new Promise<T>((resolve) => {
    resolver = resolve;
  });
  return { promesa, resolver };
}

describe("Inicio", () => {
  it("carga catálogos y consulta objetivos al elegir una materia", async () => {
    const user = userEvent.setup();
    renderizarInicio();

    expect(await screen.findByRole("option", { name: "Matemáticas" })).not.toBeNull();
    expect(screen.getByRole("option", { name: "5.º" })).not.toBeNull();

    await user.selectOptions(screen.getByLabelText("Materia"), "Matemáticas");

    expect(api.listarObjetivos).toHaveBeenCalledWith({
      materia: "Matemáticas",
      grado: "",
      titulo: "",
    });
    expect(await screen.findByRole("button", {
      name: "Resolver problemas aplicando conceptos matemáticos",
    })).not.toBeNull();
  });

  it("descarta sugerencias obsoletas y limpia las anteriores al cambiar de materia", async () => {
    const user = userEvent.setup();
    const respuestaMatematicas = promesaDiferidaConValor<string[]>();
    renderizarInicio();
    vi.mocked(api.listarObjetivos)
      .mockReset()
      .mockReturnValueOnce(respuestaMatematicas.promesa)
      .mockResolvedValueOnce(["Explicar fenómenos científicos"]);
    await screen.findByRole("option", { name: "Matemáticas" });

    await user.selectOptions(screen.getByLabelText("Materia"), "Matemáticas");
    await user.selectOptions(screen.getByLabelText("Materia"), "Ciencias");
    expect(await screen.findByRole("button", {
      name: "Explicar fenómenos científicos",
    })).not.toBeNull();

    await act(async () => {
      respuestaMatematicas.resolver(["Sugerencia matemática obsoleta"]);
      await respuestaMatematicas.promesa;
    });

    expect(screen.queryByRole("button", {
      name: "Sugerencia matemática obsoleta",
    })).toBeNull();
    expect(screen.queryByRole("button", {
      name: "Resolver problemas aplicando conceptos matemáticos",
    })).toBeNull();
  });

  it("alterna la selección accesible de un objetivo sugerido", async () => {
    const user = userEvent.setup();
    renderizarInicio();
    await screen.findByRole("option", { name: "Matemáticas" });
    await user.selectOptions(screen.getByLabelText("Materia"), "Matemáticas");

    const objetivo = await screen.findByRole("button", {
      name: "Resolver problemas aplicando conceptos matemáticos",
    });
    expect(objetivo.getAttribute("aria-pressed")).toBe("false");

    await user.click(objetivo);
    expect(objetivo.getAttribute("aria-pressed")).toBe("true");
    await user.click(objetivo);
    expect(objetivo.getAttribute("aria-pressed")).toBe("false");
  });

  it("normaliza objetivos personalizados, evita duplicados y limpia chips al cambiar materia", async () => {
    const user = userEvent.setup();
    renderizarInicio();
    vi.mocked(api.listarObjetivos)
      .mockReset()
      .mockResolvedValueOnce([
        "Objetivo compartido",
        "Resolver problemas aplicando conceptos matemáticos",
      ])
      .mockResolvedValueOnce([
        "Objetivo compartido",
        "Explicar fenómenos científicos",
      ]);
    await screen.findByRole("option", { name: "Matemáticas" });
    await user.selectOptions(screen.getByLabelText("Materia"), "Matemáticas");
    await user.click(await screen.findByRole("button", {
      name: "Objetivo compartido",
    }));

    const campoPersonalizado = screen.getByLabelText("Objetivo personalizado");
    await user.type(campoPersonalizado, "  Comparar fracciones  ");
    await user.click(screen.getByRole("button", { name: "Agregar objetivo" }));

    const personalizado = screen.getByRole("button", { name: "Comparar fracciones" });
    expect(personalizado.getAttribute("aria-pressed")).toBe("true");
    await user.type(campoPersonalizado, " Comparar fracciones ");
    await user.click(screen.getByRole("button", { name: "Agregar objetivo" }));
    expect(screen.getAllByRole("button", { name: "Comparar fracciones" })).toHaveLength(1);

    await user.selectOptions(screen.getByLabelText("Materia"), "Ciencias");

    expect(await screen.findByRole("button", {
      name: "Explicar fenómenos científicos",
    })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Comparar fracciones" })).toBeNull();
    expect(screen.queryByRole("button", {
      name: "Resolver problemas aplicando conceptos matemáticos",
    })).toBeNull();
    expect(screen.getByRole("button", {
      name: "Objetivo compartido",
    }).getAttribute("aria-pressed")).toBe("false");
    expect((campoPersonalizado as HTMLInputElement).value).toBe("");
  });

  it("mantiene las opciones de creación deshabilitadas hasta completar los campos requeridos", async () => {
    const user = userEvent.setup();
    renderizarInicio();
    const crearEnBlanco = screen.getByRole("button", {
      name: /^Clase en blancoEmpieza/,
    });

    expect((crearEnBlanco as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByLabelText("Título"), "Fracciones");
    expect((crearEnBlanco as HTMLButtonElement).disabled).toBe(true);
    await user.selectOptions(
      await screen.findByLabelText("Materia"),
      "Matemáticas",
    );
    expect((crearEnBlanco as HTMLButtonElement).disabled).toBe(true);
    await user.selectOptions(screen.getByLabelText("Grado"), "5.º");
    expect((crearEnBlanco as HTMLButtonElement).disabled).toBe(false);
  });

  it("crea la clase con los metadatos y objetivos en su orden visual", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "crearProyecto").mockResolvedValue({
      carpeta: "fracciones",
      clase: claseCreada,
    });
    renderizarInicio();
    await screen.findByRole("option", { name: "Matemáticas" });
    await user.type(screen.getByLabelText("Título"), "Fracciones");
    await user.selectOptions(screen.getByLabelText("Grado"), "5.º");
    await user.selectOptions(screen.getByLabelText("Materia"), "Matemáticas");

    const campoPersonalizado = screen.getByLabelText("Objetivo personalizado");
    await user.type(campoPersonalizado, "Comparar fracciones en situaciones cotidianas");
    await user.click(screen.getByRole("button", { name: "Agregar objetivo" }));
    await user.click(await screen.findByRole("button", {
      name: "Resolver problemas aplicando conceptos matemáticos",
    }));
    await user.click(screen.getByRole("button", { name: /^Clase en blancoEmpieza/ }));

    expect(api.crearProyecto).toHaveBeenCalledWith(
      "Fracciones",
      null,
      {
        materia: "Matemáticas",
        grado: "5.º",
        objetivos: [
          "Resolver problemas aplicando conceptos matemáticos",
          "Comparar fracciones en situaciones cotidianas",
        ],
      },
    );
  });

  it("permite crear con objetivos personalizados si fallan las sugerencias", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "crearProyecto").mockResolvedValue({
      carpeta: "fracciones",
      clase: claseCreada,
    });
    renderizarInicio();
    vi.mocked(api.listarObjetivos).mockReset().mockRejectedValue(
      new Error("No se pudieron cargar las sugerencias"),
    );
    await screen.findByRole("option", { name: "Matemáticas" });
    await user.type(screen.getByLabelText("Título"), "Fracciones");
    await user.selectOptions(screen.getByLabelText("Grado"), "5.º");
    await user.selectOptions(screen.getByLabelText("Materia"), "Matemáticas");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No se pudieron cargar las sugerencias",
    );
    await user.type(
      screen.getByLabelText("Objetivo personalizado"),
      "Comparar fracciones",
    );
    await user.click(screen.getByRole("button", { name: "Agregar objetivo" }));
    const crearEnBlanco = screen.getByRole("button", {
      name: /^Clase en blancoEmpieza/,
    });
    expect((crearEnBlanco as HTMLButtonElement).disabled).toBe(false);
    await user.click(crearEnBlanco);

    expect(api.crearProyecto).toHaveBeenCalledWith("Fracciones", null, {
      materia: "Matemáticas",
      grado: "5.º",
      objetivos: ["Comparar fracciones"],
    });
  });

  it("conserva los metadatos y objetivos seleccionados cuando falla la creación", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "crearProyecto").mockRejectedValue(new Error("No se pudo crear"));
    renderizarInicio();
    await screen.findByRole("option", { name: "Matemáticas" });
    await user.type(screen.getByLabelText("Título"), "Fracciones");
    await user.selectOptions(screen.getByLabelText("Grado"), "5.º");
    await user.selectOptions(screen.getByLabelText("Materia"), "Matemáticas");
    const sugerido = await screen.findByRole("button", {
      name: "Resolver problemas aplicando conceptos matemáticos",
    });
    await user.click(sugerido);
    await user.click(screen.getByRole("button", { name: /^Clase en blancoEmpieza/ }));

    expect((await screen.findByRole("alert")).textContent).toContain("No se pudo crear");
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("Fracciones");
    expect((screen.getByLabelText("Materia") as HTMLSelectElement).value).toBe("Matemáticas");
    expect((screen.getByLabelText("Grado") as HTMLSelectElement).value).toBe("5.º");
    expect(sugerido.getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("button", {
      name: /^Clase en blancoEmpieza/,
    }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("abre el diálogo para la clase elegida y cancelar la conserva", async () => {
    const user = userEvent.setup();
    renderizarInicio();
    await screen.findByText("Fracciones");

    const botonInvocador = screen.getByRole("button", { name: "Borrar clase Fracciones" });
    await user.click(botonInvocador);

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
    await waitFor(() => expect(document.activeElement).toBe(botonInvocador));
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
    await waitFor(() => expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Mis clases" }),
    ));
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

    const botonInvocador = screen.getByRole("button", { name: "Borrar clase Fracciones" });
    await user.click(botonInvocador);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(botonInvocador));
  });

  it("confina Tab en el diálogo e impide activar el fondo", async () => {
    const user = userEvent.setup();
    const { alAbrir } = renderizarInicio();
    await screen.findByText("Fracciones");
    const botonAbrirFondo = screen.getByRole("button", {
      name: /^FraccionesClase en blanco/,
    });

    await user.click(screen.getByRole("button", { name: "Borrar clase Fracciones" }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /^Borrar$/ }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" }));

    await user.click(botonAbrirFondo);
    expect(alAbrir).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  it("deshabilita confirmar y cancelar mientras el borrado está pendiente", async () => {
    const user = userEvent.setup();
    const diferida = promesaDiferida();
    vi.spyOn(api, "borrarProyecto").mockReturnValue(diferida.promesa);
    renderizarInicio([
      proyectos[0],
      {
        carpeta: "Algebra",
        titulo: "Álgebra",
        modificado: "2026-07-25T11:00:00.000Z",
        scaffold: null,
      },
    ]);
    await screen.findByText("Fracciones");
    const botonBorrarAlgebra = screen.getByRole("button", { name: "Borrar clase Álgebra" });

    await user.click(screen.getByRole("button", { name: "Borrar clase Fracciones" }));
    await user.click(screen.getByRole("button", { name: /^Borrar$/ }));

    await waitFor(() => expect(api.borrarProyecto).toHaveBeenCalledWith("Fracciones"));
    expect((screen.getByRole("button", { name: /^Borrar$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement).disabled).toBe(true);
    const dialogo = screen.getByRole("dialog");
    expect(dialogo).not.toBeNull();

    await user.tab();
    expect(document.activeElement).toBe(dialogo);
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).not.toBeNull();
    await user.click(botonBorrarAlgebra);
    expect(screen.getByText("¿Borrar “Fracciones”?"))
      .not.toBeNull();

    diferida.resolver();
  });
});
