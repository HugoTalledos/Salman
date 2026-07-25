import type { CatalogoScaffolds } from "../../application/port/CatalogoScaffolds";
import type { DefinicionScaffold } from "../../domain/entity/Scaffold";
import { inicioDesarrolloCierre } from "./InicioDesarrolloCierre";

const scaffolds: readonly DefinicionScaffold[] = [inicioDesarrolloCierre];

export const catalogoScaffolds: CatalogoScaffolds = {
  listar: () => scaffolds,
  obtener: (id) => scaffolds.find((scaffold) => scaffold.id === id),
};
