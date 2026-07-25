import { catalogoScaffolds } from "../server/clases/infrastructure/scaffold/CatalogoScaffolds";
import type { DefinicionScaffold } from "./tipos";
export { crearClase } from "../server/clases/domain/service/CrearClase";

export type { DefinicionScaffold } from "./tipos";

export const scaffolds: DefinicionScaffold[] = [...catalogoScaffolds.listar()];

export function obtenerScaffold(id: string): DefinicionScaffold | undefined {
  return catalogoScaffolds.obtener(id);
}
