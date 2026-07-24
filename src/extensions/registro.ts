import type { Agente, Skill } from "./tipos";

/**
 * Registro global de extensiones. Aquí es donde una futura versión de Salman
 * dará de alta agentes y skills; en esta versión permanece vacío a propósito.
 */

const agentes = new Map<string, Agente>();
const skills = new Map<string, Skill>();

export function registrarAgente(agente: Agente): void {
  if (agentes.has(agente.id)) {
    throw new Error(`Ya hay un agente registrado con id «${agente.id}»`);
  }
  agentes.set(agente.id, agente);
}

export function registrarSkill(skill: Skill): void {
  if (skills.has(skill.id)) {
    throw new Error(`Ya hay una skill registrada con id «${skill.id}»`);
  }
  skills.set(skill.id, skill);
}

export function agentesRegistrados(): Agente[] {
  return [...agentes.values()];
}

export function skillsRegistradas(): Skill[] {
  return [...skills.values()];
}
