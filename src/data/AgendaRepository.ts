// REPOSITORY (piso 3): la única puerta hacia los datos (SQLite y servidor).
// Los ViewModel le piden cosas con nombre; no saben si vienen de la base o de la red.
import {AJUSTES_INICIALES, Ajustes, ClaveAjuste} from '../domain/ajustes';
import {Charla, esFicha} from '../domain/charla';
import {esLectura, Lectura} from '../domain/lectura';
import {api, solicitudes} from '../lab/servicio';
import {ajuste, AJUSTE_EDICION, alternar, configurar, guardar, listar} from './archivo';

const AJUSTE_LECTURA = 'punto_de_lectura';

export type ProgramaLocal = {charlas: Charla[]; hayEdicion: boolean};

export const agendaRepository = {
  // Lo que hay guardado en el teléfono (funciona sin señal).
  // hayEdicion dice si alguna vez se descargó un programa, aunque tenga cero charlas.
  // Las instalaciones anteriores no tienen la marca, pero sí charlas: también cuentan.
  async leerLocal(): Promise<ProgramaLocal> {
    const [charlas, marca] = await Promise.all([listar(), ajuste(AJUSTE_EDICION, 'no')]);
    return {charlas, hayEdicion: marca === 'si' || charlas.length > 0};
  },

  alternarFavorita(id: string): Promise<void> {
    return alternar(id);
  },

  // Trae el programa del servidor, lo revisa y lo deja guardado en el teléfono.
  async sincronizar(): Promise<void> {
    const respuesta = await api.get<unknown>('/programa');
    const datos = respuesta.data;
    if (!Array.isArray(datos) || !datos.every(esFicha)) {
      throw new Error('El servidor devolvió un programa con formato inesperado');
    }
    await guardar(datos);
  },

  // --- Punto de lectura (pedido 43) ---
  // Devuelve lo guardado solo si es de la misma tarea de Android. Una tarea nueva no hereda nada.
  async leerLectura(tarea: string): Promise<Lectura | null> {
    if (!tarea) return null;
    try {
      const guardado: unknown = JSON.parse(await ajuste(AJUSTE_LECTURA, 'null'));
      if (typeof guardado !== 'object' || guardado === null) return null;
      if ((guardado as {tarea?: unknown}).tarea !== tarea || !esLectura(guardado)) return null;
      return {seccion: guardado.seccion, fichaId: guardado.fichaId, dia: guardado.dia, tema: guardado.tema};
    } catch {
      return null; // si no se puede leer o está dañado, se arranca desde el principio
    }
  },

  guardarLectura(tarea: string, lectura: Lectura): Promise<void> {
    return configurar(AJUSTE_LECTURA, JSON.stringify({tarea, ...lectura}));
  },

  // --- Ajustes del servicio de prueba (pantalla Mesa) ---
  async leerAjustes(): Promise<Ajustes> {
    const [revision, disponible, lenta] = await Promise.all([
      ajuste('revision', AJUSTES_INICIALES.revision),
      ajuste('disponible', AJUSTES_INICIALES.disponible),
      ajuste('lenta', AJUSTES_INICIALES.lenta),
    ]);
    return {revision, disponible, lenta};
  },

  cambiarAjuste(clave: ClaveAjuste, valor: string): Promise<void> {
    return configurar(clave, valor);
  },

  // La app se abrió con el pedido "sin servicio" (lo manda MainActivity.kt).
  iniciarSinServicio(): Promise<void> {
    return configurar('disponible', 'no');
  },

  // Cuántas veces se le pidió el programa al servidor desde que nació el proceso.
  solicitudesEnSesion(): number {
    return solicitudes;
  },
};
