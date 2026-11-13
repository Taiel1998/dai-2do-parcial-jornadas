// VIEWMODEL (piso 2): guarda el estado de la agenda y decide. No sabe SQL ni dibuja.
// El estado vive fuera de los componentes, así sobrevive cuando una pantalla
// se desmonta (rotar, abrir una ficha, cambiar de pestaña).
import {useMemo, useSyncExternalStore} from 'react';
import {agendaRepository as repo} from '../../data/AgendaRepository';
import {Charla, filtrarCharlas, soloAgenda} from '../../domain/charla';
import {Lectura, LECTURA_INICIAL, Seccion} from '../../domain/lectura';

export type Fase = 'cargando' | 'listo' | 'error';

type Estado = Lectura & {
  charlas: Charla[];
  hayEdicion: boolean;   // ya hay un programa descargado en el teléfono (aunque esté vacío)
  fase: Fase;            // un solo cartel a la vez: cargando, listo o error
  aviso: string;         // mensaje sobre el programa, para personas
  avisoAgenda: string;   // mensaje si no se pudo marcar una charla
  descargas: number;     // cuántas descargas arrancó este ViewModel (avisa a la Mesa que relea el contador)
};

const AVISO_CON_DATOS = 'No se pudo actualizar el programa. Se están usando datos guardados.';
const AVISO_SIN_DATOS = 'No se pudo consultar el programa y todavía no hay datos guardados.';

let estado: Estado = {...LECTURA_INICIAL, charlas: [], hayEdicion: false, fase: 'listo', aviso: '', avisoAgenda: '', descargas: 0};
const observadores = new Set<() => void>();
let tarea = ''; // identificador de la tarea de Android que está usando la app

function publicar(cambios: Partial<Estado>) {
  const anterior = estado;
  estado = {...estado, ...cambios};
  observadores.forEach(fn => fn());
  // Pedido 43: cada vez que cambia el punto de lectura queda guardado en el teléfono.
  const cambioLectura = anterior.seccion !== estado.seccion || anterior.fichaId !== estado.fichaId
    || anterior.dia !== estado.dia || anterior.tema !== estado.tema;
  if (tarea && cambioLectura) {
    const {seccion, fichaId, dia, tema} = estado;
    // Si este guardado falla la app sigue funcionando; solo no se podrá retomar el lugar.
    repo.guardarLectura(tarea, {seccion, fichaId, dia, tema}).catch(() => {});
  }
}
function suscribir(fn: () => void) {
  observadores.add(fn);
  return () => { observadores.delete(fn); };
}

// ---- Descargas (pedido 44) ----
type Origen = 'automatica' | 'explicita';
let cargaAutomaticaHecha = false;       // una sola carga automática por proceso
let enCurso: Origen | null = null;      // candado: qué descarga está en camino
let actualizacionPendiente = false;     // el usuario pidió actualizar durante la carga automática

async function descargar(origen: Origen): Promise<void> {
  enCurso = origen;
  publicar({fase: 'cargando', aviso: '', descargas: estado.descargas + 1});
  try {
    await repo.sincronizar();
    publicar({...(await repo.leerLocal()), fase: 'listo'});
  } catch {
    // Pedido 41: la lista guardada no se toca; solo cambia el mensaje.
    publicar({fase: 'error', aviso: estado.hayEdicion ? AVISO_CON_DATOS : AVISO_SIN_DATOS});
  } finally {
    // Haya salido bien o mal, se suelta el candado para poder volver a pedir.
    enCurso = null;
    if (actualizacionPendiente) {
      actualizacionPendiente = false;
      void descargar('explicita');
    }
  }
}

// Botones "Actualizar" y "Reintentar".
function actualizar() {
  if (enCurso === 'explicita' || actualizacionPendiente) return; // doble toque: ya hay una pedida
  if (enCurso === 'automatica') {
    actualizacionPendiente = true; // se hace una sola, cuando termine la automática
    return;
  }
  void descargar('explicita');
}

// Arranque de la app. Lo llama useInicioViewModel con los datos que manda MainActivity.kt.
export async function iniciar(taskKey: string, sinServicio: boolean): Promise<void> {
  if (sinServicio) await repo.iniciarSinServicio();
  const [local, guardada] = await Promise.all([repo.leerLocal(), repo.leerLectura(taskKey)]);
  // Misma tarea (Android la recuperó): vuelve a la ficha y a los filtros.
  // Tarea nueva: arranca sin filtros, aunque el proceso siguiera vivo.
  tarea = '';
  publicar({...local, ...(guardada ?? LECTURA_INICIAL), avisoAgenda: ''});
  tarea = taskKey;
  if (!cargaAutomaticaHecha) {
    cargaAutomaticaHecha = true;
    void descargar('automatica');
  }
}

// ---- Mi agenda (pedido 42) ----
const marcando = new Set<string>(); // candado por charla contra el doble toque
async function marcar(id: string) {
  if (marcando.has(id)) return;
  marcando.add(id);
  try {
    await repo.alternarFavorita(id);
    publicar({...(await repo.leerLocal()), avisoAgenda: ''});
  } catch {
    publicar({avisoAgenda: 'No se pudo guardar el cambio en tu agenda. Probá de nuevo.'});
  } finally {
    marcando.delete(id);
  }
}

// ---- Punto de lectura (pedido 43) ----
const elegirDia = (dia: number) => publicar({dia});
const elegirTema = (tema: string) => publicar({tema});
const elegirSeccion = (seccion: Seccion) => publicar({seccion});
const abrirFicha = (fichaId: string) => publicar({fichaId, avisoAgenda: ''});
const cerrarFicha = () => publicar({fichaId: null});
// Botón "atrás" del teléfono. Devuelve true si la app se ocupó.
function retroceder(): boolean {
  if (estado.fichaId) { cerrarFicha(); return true; }
  if (estado.seccion !== 'Programa') { elegirSeccion('Programa'); return true; }
  return false;
}

// Lo que reciben las pantallas: el estado y las acciones. Nada más.
export function useProgramaViewModel() {
  const e = useSyncExternalStore(suscribir, () => estado);
  const visibles = useMemo(() => filtrarCharlas(e.charlas, e.dia, e.tema), [e.charlas, e.dia, e.tema]);
  const agenda = useMemo(() => soloAgenda(e.charlas), [e.charlas]);
  const ficha = useMemo(() => e.charlas.find(c => c.id === e.fichaId), [e.charlas, e.fichaId]);
  return {...e, visibles, agenda, ficha,
    actualizar, marcar, elegirDia, elegirTema, elegirSeccion, abrirFicha, cerrarFicha, retroceder};
}
