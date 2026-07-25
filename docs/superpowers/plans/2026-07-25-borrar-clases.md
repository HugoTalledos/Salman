# Borrado de clases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir borrar definitivamente una clase y sus recursos desde el listado principal mediante un botón visible y un diálogo de confirmación propio.

**Architecture:** La UI enviará `DELETE /api/proyectos/:carpeta` y retirará localmente el resumen tras recibir 204. El endpoint delegará en un caso de uso pequeño, que usará el repositorio de proyectos para validar el identificador, comprobar la existencia y borrar únicamente el directorio correspondiente.

**Tech Stack:** React 19, TypeScript 6, Hono, Node.js `fs/promises`, Vitest y Testing Library.

## Global Constraints

- El borrado es definitivo e incluye `clase.salman`, recursos y artefactos compilados.
- El diálogo propio debe nombrar la clase, advertir que no se puede deshacer y ofrecer “Cancelar” y “Borrar”.
- Durante la petición ambas acciones quedan deshabilitadas.
- Un error mantiene el diálogo y la clase visibles y permite reintentar.
- No se añaden papelera, restauración, selección múltiple ni borrado desde el editor.
- No se modifican los cambios locales preexistentes en `.gitignore` ni `package.json`.

---

### Task 1: Operación de dominio y persistencia

**Files:**
- Create: `src/server/clases/application/useCase/BorrarProyecto.ts`
- Create: `src/server/clases/application/useCaseImpl/BorrarProyectoImpl.ts`
- Modify: `src/server/clases/domain/repository/ProyectoRepository.ts`
- Modify: `src/server/clases/application/useCaseImpl/Proyectos.test.ts`
- Modify: `src/server/clases/infrastructure/persistence/ProyectoFileSystemRepository.ts`
- Modify: `src/server/clases/infrastructure/persistence/ProyectoFileSystemRepository.test.ts`

**Interfaces:**
- Produces: `BorrarProyecto.ejecutar(carpeta: string): Promise<void>`.
- Produces: `ProyectoRepository.borrar(carpeta: string): Promise<void>`.
- Preserves: `ProyectoNoExiste` for missing projects and `NombreProyectoInvalido` for unsafe names.

- [ ] **Step 1: Write failing use-case and repository tests**

Add `carpetaBorrada?: string` and this fake method to `RepositorioFake`:

```ts
async borrar(carpeta: string): Promise<void> {
  this.carpetaBorrada = carpeta;
}
```

Import `BorrarProyectoImpl` and add:

```ts
describe("BorrarProyectoImpl", () => {
  it("delega el borrado de la carpeta solicitada", async () => {
    const repositorio = new RepositorioFake();

    await new BorrarProyectoImpl(repositorio).ejecutar("Fracciones");

    expect(repositorio.carpetaBorrada).toBe("Fracciones");
  });
});
```

In the filesystem repository suite add:

```ts
it("borra el proyecto completo con sus recursos", async () => {
  const carpeta = await repositorio.crear(claseEjemplo);
  await repositorio.escribirRecurso(carpeta, "mapa.png", new Uint8Array([1]));

  await repositorio.borrar(carpeta);

  await expect(fs.access(path.join(base, carpeta))).rejects.toThrow();
  await expect(repositorio.obtener(carpeta)).rejects.toThrow(/No existe/);
});

it("rechaza borrar proyectos inexistentes o identificadores inseguros", async () => {
  await expect(repositorio.borrar("fantasma")).rejects.toThrow(/No existe/);
  await expect(repositorio.borrar("../fuera")).rejects.toThrow(/inválido/);
});
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npx vitest run src/server/clases/application/useCaseImpl/Proyectos.test.ts src/server/clases/infrastructure/persistence/ProyectoFileSystemRepository.test.ts
```

Expected: FAIL because `borrar` and `BorrarProyectoImpl` do not exist.

- [ ] **Step 3: Implement the minimal contracts and filesystem deletion**

Create the use-case contract:

```ts
export interface BorrarProyecto {
  ejecutar(carpeta: string): Promise<void>;
}
```

Create its implementation:

```ts
import type { ProyectoRepository } from "../../domain/repository/ProyectoRepository";
import type { BorrarProyecto } from "../useCase/BorrarProyecto";

export class BorrarProyectoImpl implements BorrarProyecto {
  constructor(private readonly repositorio: ProyectoRepository) {}

  async ejecutar(carpeta: string): Promise<void> {
    await this.repositorio.borrar(carpeta);
  }
}
```

Add the method to `ProyectoRepository`, then implement it:

```ts
async borrar(carpeta: string): Promise<void> {
  validarNombreSimple(carpeta);
  await this.verificarProyecto(carpeta);
  await fs.rm(path.join(this.base, carpeta), { recursive: true });
}
```

Add a no-op `borrar` method to every other test fake implementing
`ProyectoRepository`; locate them with:

```bash
rg -n "implements ProyectoRepository" src
```

- [ ] **Step 4: Run tests to verify GREEN**

Run the two test files from Step 2. Expected: PASS.

- [ ] **Step 5: Commit the persistence slice**

```bash
git add src/server/clases/application/useCase/BorrarProyecto.ts src/server/clases/application/useCaseImpl/BorrarProyectoImpl.ts src/server/clases/application/useCaseImpl/Proyectos.test.ts src/server/clases/domain/repository/ProyectoRepository.ts src/server/clases/infrastructure/persistence/ProyectoFileSystemRepository.ts src/server/clases/infrastructure/persistence/ProyectoFileSystemRepository.test.ts
git commit -m "feat(clases): add project deletion use case"
```

### Task 2: Endpoint DELETE y composición

**Files:**
- Modify: `src/server/clases/infrastructure/http/RutasClases.ts`
- Modify: `src/server/clases/infrastructure/http/RutasClases.test.ts`
- Modify: `src/server/app.ts`

**Interfaces:**
- Consumes: `BorrarProyecto.ejecutar(carpeta: string): Promise<void>`.
- Produces: `DELETE /api/proyectos/:carpeta`, returning 204 on success and 404 for a missing project.

- [ ] **Step 1: Write failing HTTP tests**

Wire `BorrarProyectoImpl` into the test dependency factory and add:

```ts
it("DELETE borra la clase y deja de listarla", async () => {
  const carpeta = await repositorio.crear(claseEjemplo);

  const res = await app.request(`/api/proyectos/${encodeURIComponent(carpeta)}`, {
    method: "DELETE",
  });

  expect(res.status).toBe(204);
  expect(await res.text()).toBe("");
  expect((await repositorio.listar())).toEqual([]);
});

it("DELETE de una clase inexistente responde 404", async () => {
  const res = await app.request("/api/proyectos/fantasma", { method: "DELETE" });

  expect(res.status).toBe(404);
  expect((await json<{ error: string }>(res)).error).toContain("No existe");
});
```

- [ ] **Step 2: Run the HTTP suite to verify RED**

Run:

```bash
npx vitest run src/server/clases/infrastructure/http/RutasClases.test.ts
```

Expected: FAIL because DELETE currently returns 404.

- [ ] **Step 3: Add the route and production composition**

Add `borrarProyecto: BorrarProyecto` to `DependenciasRutasClases` and:

```ts
rutas.delete("/api/proyectos/:carpeta", async (contexto) => {
  await dependencias.borrarProyecto.ejecutar(contexto.req.param("carpeta"));
  return contexto.body(null, 204);
});
```

In `crearApp`, construct `new BorrarProyectoImpl(repositorio)` and pass it to
`crearRutasClases`. Mirror this wiring in the HTTP test dependency factory.

- [ ] **Step 4: Run the HTTP suite to verify GREEN**

Run the suite from Step 2. Expected: PASS.

- [ ] **Step 5: Commit the HTTP slice**

```bash
git add src/server/clases/infrastructure/http/RutasClases.ts src/server/clases/infrastructure/http/RutasClases.test.ts src/server/app.ts
git commit -m "feat(api): expose class deletion endpoint"
```

### Task 3: Botón visible y diálogo de confirmación

**Files:**
- Create: `src/ui/Inicio.test.tsx`
- Modify: `src/ui/api.ts`
- Modify: `src/ui/Inicio.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: `DELETE /api/proyectos/:carpeta` with an empty 204 response.
- Produces: `api.borrarProyecto(carpeta: string): Promise<void>`.
- Produces: a visible “Borrar clase” action per row and an accessible `dialog`.

- [ ] **Step 1: Write failing interaction tests**

Create `Inicio.test.tsx` with jsdom, cleanup, restored mocks, and a helper that
mocks `listarProyectos`/`listarScaffolds`. Cover these behaviors with real user
events:

```ts
it("abre el diálogo para la clase elegida y cancelar la conserva", async () => {
  const user = userEvent.setup();
  renderizarInicio();
  await screen.findByText("Fracciones");

  await user.click(screen.getByRole("button", { name: "Borrar clase Fracciones" }));

  expect(screen.getByRole("dialog")).not.toBeNull();
  expect(screen.getByText("¿Borrar “Fracciones”?")).not.toBeNull();
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
  await user.click(screen.getByRole("button", { name: "Borrar", exact: true }));

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
  await user.click(screen.getByRole("button", { name: "Borrar", exact: true }));

  expect(await screen.findByText("No se pudo borrar")).not.toBeNull();
  expect(screen.getByRole("dialog")).not.toBeNull();
  expect(screen.getByText("Fracciones")).not.toBeNull();
});
```

Also test that Escape closes an idle dialog and that confirm/cancel are disabled
while a deferred delete promise is pending.

- [ ] **Step 2: Run the UI test to verify RED**

Run:

```bash
npx vitest run src/ui/Inicio.test.tsx
```

Expected: FAIL because the delete API method and buttons do not exist.

- [ ] **Step 3: Implement API parsing for an empty response**

Add:

```ts
async borrarProyecto(carpeta: string): Promise<void> {
  const r = await fetch(`/api/proyectos/${enc(carpeta)}`, { method: "DELETE" });
  if (!r.ok) await json<never>(r);
}
```

Do not call `json()` after a successful 204.

- [ ] **Step 4: Implement the row action and accessible dialog**

In `Inicio`, add state for the selected project, deletion status, and modal
error. Render each list item as a flex container holding the existing open
button and:

```tsx
<button
  type="button"
  className="borrar-proyecto"
  aria-label={`Borrar clase ${p.titulo}`}
  onClick={() => setProyectoABorrar(p)}
>
  <span aria-hidden="true">🗑️</span>
</button>
```

Render the overlay only when a project is selected. Use:

```tsx
<div
  className="dialogo-fondo"
  onMouseDown={(event) => {
    if (event.target === event.currentTarget && !borrando) cerrarDialogo();
  }}
>
  <div
    className="dialogo-borrar"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialogo-borrar-titulo"
    aria-describedby="dialogo-borrar-descripcion"
    onKeyDown={(event) => {
      if (event.key === "Escape" && !borrando) cerrarDialogo();
    }}
  >
```

Give the dialog `tabIndex={-1}`, focus it from an effect after opening, disable
both buttons while deleting, and implement confirmation as:

```ts
try {
  await api.borrarProyecto(proyectoABorrar.carpeta);
  setProyectos((actuales) =>
    actuales?.filter((p) => p.carpeta !== proyectoABorrar.carpeta) ?? null
  );
  setProyectoABorrar(null);
} catch (e) {
  setErrorBorrado((e as Error).message);
} finally {
  setBorrando(false);
}
```

Add focused CSS for `.fila-proyecto-con-acciones`, `.borrar-proyecto`,
`.dialogo-fondo`, `.dialogo-borrar`, `.dialogo-acciones`, and the destructive
button. Keep the open button as the flexible portion of the row and add a
mobile rule that allows metadata to wrap.

- [ ] **Step 5: Run UI tests and refactor while GREEN**

Run the UI test from Step 2. Expected: PASS with no warnings.

If modal state makes `Inicio.tsx` difficult to read, extract only the dialog to
`src/ui/DialogoBorrarClase.tsx`, keeping its props limited to selected project,
busy state, error, cancel, and confirm.

- [ ] **Step 6: Commit the UI slice**

```bash
git add src/ui/Inicio.test.tsx src/ui/api.ts src/ui/Inicio.tsx src/App.css
git commit -m "feat(ui): confirm class deletion from home"
```

### Task 4: Verificación integral

**Files:**
- Modify only files required to correct failures introduced by Tasks 1–3.

**Interfaces:**
- Verifies the complete class-deletion flow and all existing behavior.

- [ ] **Step 1: Run all automated checks**

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit 0 without new warnings or errors.

- [ ] **Step 2: Inspect the final diff**

```bash
git status --short
git diff --check
git diff HEAD~3 -- src
```

Confirm the diff contains only the deletion feature, retains the unrelated
`.gitignore` and `package.json` changes, and has no whitespace errors.

- [ ] **Step 3: Commit any verification-only correction**

If Step 1 required a correction:

```bash
git add <only-the-corrected-feature-files>
git commit -m "fix: finalize class deletion flow"
```

If no correction was needed, do not create an empty commit.
