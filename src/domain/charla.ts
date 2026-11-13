// DOMINIO: tipos y reglas de la agenda.
// No sabe nada de pantallas, de SQLite ni de la red.

// Lo que publica el servidor por cada charla.
export type Ficha = {id: string; title: string; track: string; day: number; time: string;
  room: string; speaker: string; summary: string};

// Lo que usa la app: la ficha más la marca "está en mi agenda".
// En SQLite se guarda como 0/1, pero hacia arriba viaja como verdadero/falso.
export type Charla = Ficha & {favorita: boolean};

export const TODOS = 'Todos';
// La posición en la lista es el número de día. La posición 0 significa "sin filtro".
export const DIAS = ['Ambos días', 'Día 1', 'Día 2'];
export const TEMAS = [TODOS, 'Android', 'Datos', 'Calidad'];

// Única regla de filtrado del programa (antes estaba escrita dentro de la pantalla).
export function filtrarCharlas(charlas: Charla[], dia: number, tema: string): Charla[] {
  return charlas.filter(c => (dia === 0 || c.day === dia) && (tema === TODOS || c.track === tema));
}

// Única regla de "qué va en Mi agenda" (antes estaba escrita dos veces en App.tsx).
export function soloAgenda(charlas: Charla[]): Charla[] {
  return charlas.filter(c => c.favorita);
}

// Revisa que un dato que llegó del servidor tenga la forma de una ficha.
export function esFicha(dato: unknown): dato is Ficha {
  if (typeof dato !== 'object' || dato === null) return false;
  const f = dato as Record<string, unknown>;
  return typeof f.id === 'string' && typeof f.title === 'string' && typeof f.track === 'string'
    && typeof f.day === 'number' && typeof f.time === 'string' && typeof f.room === 'string'
    && typeof f.speaker === 'string' && typeof f.summary === 'string';
}
