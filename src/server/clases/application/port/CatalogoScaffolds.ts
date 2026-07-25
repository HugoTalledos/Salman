import type { DefinicionScaffold } from "../../domain/entity/Scaffold";

export interface CatalogoScaffolds {
  listar(): readonly DefinicionScaffold[];
  obtener(id: string): DefinicionScaffold | undefined;
}
