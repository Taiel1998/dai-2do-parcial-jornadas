# Cambios · Jornadas del Sur (React Native)

Guardia de mantenimiento: pedidos 41 a 44 del README y reordenamiento por capas.

## 1. Cómo quedó ordenado el proyecto

Antes: la interfaz, el estado, la navegación y parte del acceso a datos estaban mezclados en `App.tsx` y `src/ui`. Ahora cada archivo tiene un solo trabajo (MVVM + Repository).

| Capa | Archivos | Qué hace |
|---|---|---|
| Pantalla | `App.tsx`, `src/presentation/screens/` (`Portada`, `Catalogo`, `Detalle`, `MiAgenda`, `Mesa`), `src/presentation/components/componentes.tsx` | Dibuja lo que dice el ViewModel y avisa los toques. No tiene SQL, ni red, ni reglas. |
| ViewModel | `src/presentation/viewmodel/` (`useProgramaViewModel`, `useInicioViewModel`, `useMesaViewModel`) | Guarda el estado (cargando, listo, error), decide y ataja errores. |
| Repository | `src/data/AgendaRepository.ts` | Única puerta a los datos: SQLite y servidor. |
| Datos | `src/data/archivo.ts` (SQLite), `src/lab/` (servidor simulado, sin tocar) | Guarda y trae. |
| Dominio | `src/domain/` (`charla`, `lectura`, `ajustes`) | Tipos y reglas puras: filtrar, qué va en Mi agenda, validar lo que llega. |

`src/ui` se eliminó: sus archivos se movieron a `src/presentation`. `src/lab` y `src/legacy` no se modificaron.

## 2. Pedidos del README

### 41 · Programa sin señal

- **Problema:** si la consulta fallaba, `Catalogo` mostraba solo el aviso y escondía la lista, aunque el programa estuviera guardado en SQLite. No se distinguía "nunca descargué" de "descargué un programa vacío".
- **Por qué es un problema:** el usuario sin señal se quedaba sin programa teniendo los datos en el teléfono.
- **Qué hice:**
  - `useProgramaViewModel.ts`: ante una falla la lista guardada no se toca; solo cambia el mensaje. Con datos previos informa "Se están usando datos guardados"; sin descarga previa ofrece "Reintentar".
  - `archivo.ts`: al guardar un programa queda la marca `edicion_guardada` en la tabla `ajustes`, dentro de la misma transacción. Así una v4 con cero charlas sigue siendo una edición válida al reabrir sin señal y muestra "sin charlas programadas".
  - Las instalaciones anteriores no tienen esa marca: si ya tienen charlas guardadas, también cuentan como edición previa.

### 42 · Agenda personal

- **Problema:** `guardar` hacía `INSERT OR REPLACE ... VALUES (...,0)`. Cada sincronización ponía `favorita` en 0 en todas las charlas. Además nunca borraba las charlas retiradas.
- **Por qué es un problema:** el usuario perdía su agenda en cada actualización (y había una al abrir, al rotar y al volver de una ficha). Una charla retirada seguía apareciendo.
- **Qué hice (`archivo.ts`, una sola transacción):**
  - `INSERT OR IGNORE` para las charlas nuevas (entran sin marcar).
  - `UPDATE` de título, sala y demás datos sin tocar `favorita` (la 11 conserva su marca y muestra los datos de v2).
  - `DELETE` de las charlas que el servidor ya no publica (la 11 desaparece en v3; si vuelve, vuelve sin marcar).
  - Como la sincronización ya no escribe `favorita`, una marca hecha durante una petición se respeta cuando llega la respuesta.
- No usé `ON CONFLICT ... DO UPDATE` porque el SQLite de Android 8 (API 26, el mínimo del proyecto) no lo soporta.

### 43 · Volver al punto de lectura

- **Problema:** el filtro de tema era un `useState` dentro de `Catalogo`, y `Catalogo` se desmontaba al abrir una ficha y al rotar (por el `key` horizontal/vertical). La pestaña y la ficha abierta eran `useState` de `App.tsx`. `taskKey` llegaba desde `MainActivity.kt` y no se usaba.
- **Por qué es un problema:** al volver de una ficha o rotar se perdía el filtro; si Android mataba el proceso se perdía todo.
- **Qué hice:**
  - Pestaña, ficha abierta, día y tema pasaron al ViewModel (`useProgramaViewModel.ts`), que vive fuera de los componentes. Quité el `key` que forzaba el remontaje.
  - Cada cambio del punto de lectura se guarda en SQLite junto con el `taskKey` (`AgendaRepository.guardarLectura`).
  - Al arrancar (`iniciar`): si el `taskKey` es el mismo, Android recuperó la tarea y se restauran ficha y filtros. Si es otro, es una tarea nueva y arranca sin filtros, aunque el proceso siguiera vivo.
  - Lo leído se valida (`esLectura`) antes de usarlo.

### 44 · Control de descargas

- **Problema:** `recargar` se llamaba al montar `Portada`, al montar `Catalogo` (cada vez que volvía a aparecer), al volver del fondo y en cada toque, sin ningún candado.
- **Por qué es un problema:** dos descargas al abrir, una más por cada rotación, ficha o cambio de pestaña, y dos peticiones simultáneas con un doble toque.
- **Qué hice (`useProgramaViewModel.ts`):**
  - Una sola carga automática por proceso (`cargaAutomaticaHecha`).
  - Las pantallas ya no descargan al aparecer.
  - Candado `enCurso`: un segundo toque durante una petición pedida por el usuario no lanza otra. Se suelta en `finally`, así tras éxito o falla se puede volver a pedir.
  - Los filtros nunca se deshabilitan durante la espera y la lista guardada sigue visible.
  - Quité la recarga al volver del fondo: el README pide una sola carga automática por sesión.
- **Decisión de interpretación:** "Dos toques durante una petición agregan un intento" lo resolví así: dos toques seguidos en Actualizar cuentan como un intento. Si los toques llegan mientras corre la carga automática, se anota una sola actualización y se hace al terminar (una por actualización explícita).

## 3. Otras mejoras de arquitectura

| Archivo | Problema | Por qué es un problema | Qué hice |
|---|---|---|---|
| `src/ui/Mesa.tsx` | La pantalla llamaba a `ajuste` y `configurar` (SQLite) y leía `solicitudes` del laboratorio, sin `try/catch` | Capas mezcladas; si SQLite fallaba el error quedaba suelto | `useMesaViewModel` + Repository, con `try/catch`, mensaje y bandera `vivo` en la limpieza |
| `App.tsx` | Llamaba a `configurar` directo y no tenía `catch` | Si la base fallaba, la app quedaba para siempre en "Abriendo agenda…" | `useInicioViewModel` con estado abriendo / lista / error y botón Reintentar |
| `App.tsx` | Un solo componente con navegación, ficha, Mi agenda y botón atrás | Difícil de leer y de cambiar | `Portada`, `Detalle` y `MiAgenda` separados |
| `src/ui/Catalogo.tsx` | La regla de filtrado y las listas de días y temas estaban en la pantalla; "es favorita" estaba escrito dos veces | Reglas duplicadas y dentro de la vista | `filtrarCharlas` y `soloAgenda` en `src/domain/charla.ts` |
| `src/data/archivo.ts` | `favorita` viajaba como 0/1 hasta la pantalla; `SELECT *` e `INSERT` sin nombres de columnas | Se filtra cómo guarda SQLite; se rompe si cambia la tabla | Tipo de dominio con `boolean`, conversión en `aCharla`, columnas explícitas |
| `src/data/archivo.ts` | La base se abría al importar el archivo y, si fallaba, quedaba rota para siempre | No había forma de reintentar | Conexión única que se abre al primer uso y se reintenta si falló |
| `AgendaRepository.ts` | Guardaba la respuesta del servidor sin revisarla | Un dato mal formado rompía la base | Validación con `esFicha` antes de guardar |
| `Detalle` (antes en `App.tsx`) | Si la charla abierta se retiraba, la ficha quedaba en blanco | El usuario no sabía qué pasó | Mensaje "Esta charla ya no figura en el programa" |
| `programaModel.ts` | `marcar` no tenía `try/catch` ni protección de doble toque | Error sin atender; dos toques deshacían la marca | `try/catch` con mensaje y candado por charla |

## 4. Lo que estaba bien y no toqué

- Todas las consultas SQL ya usaban parámetros `?` (no hay inyección SQL).
- `guardar` ya usaba una transacción.
- El efecto del botón atrás ya tenía su limpieza (`sub.remove()`).
- `src/lab` (servidor simulado) y `src/legacy/agendaImpresa.ts` (código que nadie usa) quedaron igual.
- No agregué librerías ni cambié versiones.

## 5. Datos de los usuarios ya instalados

El README pide conservarlos. Por eso no cambié el `applicationId` (`ar.jornadasrn`), ni el nombre de la base (`cartelera.db`), ni las tablas. Lo nuevo se guarda como filas de la tabla `ajustes` que ya existía, sin migración.

## 6. Diferencias entre el README y este proyecto

El README está escrito para la versión Android nativa (nombra Retrofit, el paquete `ar.jornadas` y el extra `servicio_disponible`). En este proyecto:

- El paquete es `ar.jornadasrn`. No lo renombré: cambiarlo haría perder los datos de la versión instalada.
- `MainActivity.kt` leía el extra `sin_servicio`. Agregué que también acepte `servicio_disponible false`, que es el que nombra el README.

Comandos equivalentes:

```
adb shell am kill ar.jornadasrn
adb shell pm clear ar.jornadasrn
adb shell am start -n ar.jornadasrn/.MainActivity --ez servicio_disponible false
```

## 7. Verificación realizada

- `npm run typecheck`: sin errores.
- Bundle de JavaScript para Android con Metro (`react-native bundle`): compila completo.
- Lógica del ViewModel probada con un Repository falso: una carga automática por proceso, doble toque, volver a pedir tras éxito y tras falla, avisos con y sin datos, punto de lectura por tarea.
- Repository y SQL probados contra un SQLite real en memoria con las ediciones v1 a v4, partiendo de una base "ya instalada" con una charla marcada: las marcas se conservan en v2 y v3, la 11 vuelve sin marcar, la v4 vacía queda como edición válida y una marca hecha durante la petición se respeta.
- Las pruebas fueron temporales y no se incluyen en la entrega.
- **APK:** `gradlew assembleDebug` compila sin errores (Gradle descargó solo el JDK 17 que exige el proyecto).
- **Emulador (Pixel, API 36, con Metro):** se recorrieron los cuatro pedidos manejando la app por `adb` y leyendo la pantalla. Todo dio bien:
  - **44:** el contador dice 1 al abrir; abrir una ficha, cambiar de pestaña y rotar no lo mueven; Actualizar lo sube a 2; con demora de 8 segundos, dos toques seguidos lo suben solo a 3; los filtros responden durante la espera.
  - **42:** la charla 11 marcada en v1 sigue marcada en v2 con "Compose en producción avanzada" y "Sala Puerto"; una charla marcada durante una petición de 8 segundos queda marcada; en v3 desaparece la 11 de Programa y de Mi agenda y entra "Clínica de trazas"; al volver a v1 la 11 regresa sin marcar.
  - **41:** con el servicio apagado se ve la lista con el aviso de datos guardados, y siguen la ficha y Mi agenda; con v4 se ve "sin charlas programadas" sin error, y al cerrar y reabrir sin servicio sigue igual y sin Reintentar; tras `pm clear` y arranque con `--ez servicio_disponible false` aparece el aviso sin datos con Reintentar, y al prender el servicio y reintentar carga la lista.
  - **43:** con Día 2 + Datos quedan dos charlas después de abrir una ficha, volver y rotar; con la ficha abierta, tras Inicio y `adb shell am kill ar.jornadasrn` (el proceso murió) la tarea recuperada muestra la misma ficha y, al volver, los dos filtros, con el contador en 1; tras cerrar del todo y abrir de nuevo arranca sin filtros.

### Limitación conocida

`react-native-sqlite-storage`, usada con promesas como en este proyecto, no deshace por sí sola la transacción cuando falla una orden suelta: registra el error y continúa. La función `guardar` agrupa sus órdenes en una transacción, pero para un "todo o nada" estricto habría que agregarle a cada orden un manejador de error que la interrumpa. No se cambió porque el README no lo pide.

## 8. Cómo probar

| Pedido | Pasos | Resultado esperado |
|---|---|---|
| 44 | Abrir la app y entrar a Mesa | Peticiones: 1 |
| 44 | Cambiar de pestaña, abrir una ficha, rotar | El contador no cambia |
| 44 | Demora 8 segundos, tocar Actualizar dos veces seguidas | Suma 1 |
| 41 | Mesa: servicio "no". Programa: Actualizar | Aviso de datos guardados; la lista, la ficha y Mi agenda siguen |
| 41 | `pm clear` y arranque sin servicio | Aviso sin datos y botón Reintentar |
| 41 | Mesa: v4, Actualizar. Después servicio "no" y reabrir | "sin charlas programadas" las dos veces |
| 42 | Marcar la 11 en v1, pasar a v2, Actualizar | Sigue marcada, "Compose en producción avanzada", "Sala Puerto" |
| 42 | Pasar a v3, Actualizar | No está la 11 (ni en Mi agenda), está la 90, las demás marcas siguen |
| 42 | Volver a v1, Actualizar | La 11 vuelve sin marcar |
| 42 | Demora 8 segundos, Actualizar y marcar una charla mientras espera | La marca sigue al llegar la respuesta |
| 43 | Día 2 + Datos, abrir "Cachés para viajeros", volver, rotar | Dos resultados de Datos |
| 43 | Con la ficha abierta: Inicio, `am kill`, volver desde Recientes | Se ve la ficha; al volver, Día 2 + Datos |
| 43 | Cerrar la tarea desde Recientes y abrir de nuevo | Sin filtros |
