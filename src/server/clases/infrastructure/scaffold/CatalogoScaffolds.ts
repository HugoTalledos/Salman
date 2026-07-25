import type { DefinicionScaffold } from "../../domain/entity/Scaffold";
import { inicioDesarrolloCierre } from "./InicioDesarrolloCierre";

export interface CatalogoScaffolds {
  listar(): readonly DefinicionScaffold[];
  obtener(id: string): DefinicionScaffold | undefined;
}

const scaffolds: readonly DefinicionScaffold[] = [inicioDesarrolloCierre];

export const catalogoScaffolds: CatalogoScaffolds = {
  listar: () => scaffolds,
  obtener: (id) => scaffolds.find((scaffold) => scaffold.id === id),
};
