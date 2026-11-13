// DATOS (piso 4): lo único que sabe SQL. Solo lo usa el Repository.
// Se mantienen el nombre del archivo de base y las tablas de la versión instalada,
// para que al actualizar la app los usuarios conserven sus charlas guardadas.
import SQLite from 'react-native-sqlite-storage';
import type {Charla, Ficha} from '../domain/charla';

// El servidor simulado (src/lab/servicio.ts) importa Ficha desde este archivo.
// Se deja disponible acá para no tocar el laboratorio.
export type {Ficha} from '../domain/charla';

// Marca que queda en la tabla ajustes cuando ya se guardó un programa descargado.
// Hace falta porque un programa válido puede venir con cero charlas.
export const AJUSTE_EDICION = 'edicion_guardada';

SQLite.enablePromise(true);

function crearConexion() {
  return SQLite.openDatabase({name: 'cartelera.db', location: 'default'}).then(async archivo => {
    await archivo.executeSql(`CREATE TABLE IF NOT EXISTS charlas (
      id TEXT PRIMARY KEY, title TEXT, track TEXT, day INTEGER, time TEXT,
      room TEXT, speaker TEXT, summary TEXT, favorita INTEGER DEFAULT 0)`);
    await archivo.executeSql('CREATE TABLE IF NOT EXISTS ajustes (nombre TEXT PRIMARY KEY, valor TEXT)');
    return archivo;
  });
}

// Una sola conexión para toda la app. Se abre recién cuando alguien la pide
// y, si abrirla falla, se olvida para que el próximo pedido pueda reintentar.
let conexion: ReturnType<typeof crearConexion> | null = null;
function abrir() {
  if (!conexion) {
    conexion = crearConexion();
    conexion.catch(() => { conexion = null; });
  }
  return conexion;
}

// Así sale una fila de la tabla: SQLite no tiene verdadero/falso, guarda 0 o 1.
type FilaCharla = Ficha & {favorita: number};
function aCharla(fila: FilaCharla): Charla {
  return {...fila, favorita: fila.favorita === 1};
}

export async function listar(): Promise<Charla[]> {
  const [resultado] = await (await abrir()).executeSql(
    'SELECT id,title,track,day,time,room,speaker,summary,favorita FROM charlas ORDER BY day,time,room');
  return (resultado.rows.raw() as FilaCharla[]).map(aCharla);
}

// Deja la tabla igual a la instantánea que publicó el servidor, sin perder "Mi agenda".
export async function guardar(fichas: Ficha[]) {
  const archivo = await abrir();
  const [guardadas] = await archivo.executeSql('SELECT id FROM charlas');
  const publicadas = new Set(fichas.map(f => f.id));
  const retiradas = (guardadas.rows.raw() as {id: string}[]).map(fila => fila.id).filter(id => !publicadas.has(id));
  // Todo o nada: si un paso falla, la tabla queda como estaba.
  await archivo.transaction(tx => {
    for (const f of fichas) {
      // Charla nueva: entra con favorita en 0. Si ya existía, esta orden no hace nada.
      tx.executeSql(
        'INSERT OR IGNORE INTO charlas (id,title,track,day,time,room,speaker,summary,favorita) VALUES (?,?,?,?,?,?,?,?,0)',
        [f.id, f.title, f.track, f.day, f.time, f.room, f.speaker, f.summary]);
      // Charla que ya existía: se actualizan sus datos y NO se toca favorita.
      tx.executeSql(
        'UPDATE charlas SET title = ?, track = ?, day = ?, time = ?, room = ?, speaker = ?, summary = ? WHERE id = ?',
        [f.title, f.track, f.day, f.time, f.room, f.speaker, f.summary, f.id]);
    }
    // Charlas que el servidor retiró: se borran con su marca. Si vuelven, vuelven sin marcar.
    for (const id of retiradas) {
      tx.executeSql('DELETE FROM charlas WHERE id = ?', [id]);
    }
    // Queda anotado que hay una edición descargada, aunque haya venido vacía.
    tx.executeSql('INSERT OR REPLACE INTO ajustes (nombre, valor) VALUES (?,?)', [AJUSTE_EDICION, 'si']);
  });
}

export async function alternar(id: string) {
  await (await abrir()).executeSql('UPDATE charlas SET favorita = 1 - favorita WHERE id = ?', [id]);
}

export async function ajuste(nombre: string, defecto: string): Promise<string> {
  const [rs] = await (await abrir()).executeSql('SELECT valor FROM ajustes WHERE nombre = ?', [nombre]);
  return rs.rows.length ? rs.rows.item(0).valor : defecto;
}

export async function configurar(nombre: string, valor: string) {
  await (await abrir()).executeSql('INSERT OR REPLACE INTO ajustes (nombre, valor) VALUES (?,?)', [nombre, valor]);
}
