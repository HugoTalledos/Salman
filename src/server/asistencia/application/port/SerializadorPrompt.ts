import type { ClaseSalman } from "../../../clases/domain/entity/Clase";
import type { PoliticaAsistente } from "../../domain/policy/PoliticaAsistente";

export interface SerializadorPrompt {
  serializar(
    politica: PoliticaAsistente,
    clase: ClaseSalman,
  ): string;
}
