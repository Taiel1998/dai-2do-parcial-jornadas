// DOMINIO: ajustes del servicio de prueba que se manejan desde la Mesa.
export type Ajustes = {revision: string; disponible: string; lenta: string};
export type ClaveAjuste = keyof Ajustes;

// Valores que rigen mientras no se haya guardado otra cosa.
// Son los mismos que usa el servidor simulado de src/lab.
export const AJUSTES_INICIALES: Ajustes = {revision: '1', disponible: 'si', lenta: 'no'};
