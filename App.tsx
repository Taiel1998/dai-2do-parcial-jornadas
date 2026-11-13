import React from 'react';
import {Text,View} from 'react-native';
import {Opcion,s} from './src/presentation/components/componentes';
import {Portada} from './src/presentation/screens/Portada';
import {useInicioViewModel} from './src/presentation/viewmodel/useInicioViewModel';

// Datos que manda MainActivity.kt al abrir la app.
// taskKey identifica la tarea de Android: es la misma si Android la recupera
// después de matar el proceso, y es distinta en una tarea nueva.
type Inicio = {taskKey:string; offlineStart?:boolean};
export default function App({taskKey,offlineStart}:Inicio) {
  const inicio = useInicioViewModel(taskKey,offlineStart===true);
  if (inicio.fase==='abriendo') return <Text>Abriendo agenda…</Text>;
  if (inicio.fase==='error') return <View style={s.pagina}>
    <Text style={s.aviso}>No se pudo abrir la agenda guardada en el teléfono.</Text>
    <Opcion texto="Reintentar" accion={inicio.reintentar}/></View>;
  return <Portada/>;
}
