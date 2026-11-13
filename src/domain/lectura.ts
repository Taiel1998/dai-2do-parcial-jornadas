// DOMINIO: el "punto de lectura" del usuario (pedido 43).
// Es lo que hay que recordar para volver al mismo lugar: pestaña, ficha abierta y filtros.
import {TEMAS, TODOS} from './charla';

export const SECCIONES = ['Programa', 'Mi agenda', 'Mesa'] as const;
export type Seccion = typeof SECCIONES[number];

export type Lectura = {seccion: Seccion; fichaId: string | null; dia: number; tema: string};

// Así arranca una tarea nueva: en Programa, sin ficha abierta y sin filtros.
export const LECTURA_INICIAL: Lectura = {seccion: 'Programa', fichaId: null, dia: 0, tema: TODOS};

// Revisa que lo que se leyó del teléfono tenga forma de punto de lectura.
export function esLectura(dato: unknown): dato is Lectura {
  if (typeof dato !== 'object' || dato === null) return false;
  const l = dato as Record<string, unknown>;
  return SECCIONES.some(seccion => seccion === l.seccion)
    && (l.fichaId === null || typeof l.fichaId === 'string')
    && (l.dia === 0 || l.dia === 1 || l.dia === 2)
    && TEMAS.some(tema => tema === l.tema);
}
