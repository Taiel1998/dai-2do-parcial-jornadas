// PANTALLA (piso 1): controles del servicio de prueba. Ya no toca SQLite ni el laboratorio:
// le pide todo a su ViewModel.
import React from 'react';
import {Text,View} from 'react-native';
import {s,Opcion} from '../components/componentes';
import {useMesaViewModel} from '../viewmodel/useMesaViewModel';

export function Mesa() {
  const vm = useMesaViewModel();
  return <View><Text style={s.texto}>Peticiones en esta sesión: {vm.solicitudes}</Text>
    {!!vm.aviso && <Text style={s.aviso}>{vm.aviso}</Text>}
    <Text>Edición del programa</Text><View style={s.fila}>{['1','2','3','4'].map(v=>
      <Opcion key={v} texto={'v'+v} activa={vm.valores.revision===v} accion={()=>vm.cambiar('revision',v)}/>)}</View>
    <Text>Servicio disponible</Text><View style={s.fila}>{['si','no'].map(v=>
      <Opcion key={v} texto={v} activa={vm.valores.disponible===v} accion={()=>vm.cambiar('disponible',v)}/>)}</View>
    <Text>Demora de cada petición</Text><View style={s.fila}>{['no','si'].map(v=>
      <Opcion key={v} texto={v==='si'?'8 segundos':'1,4 segundos'} activa={vm.valores.lenta===v} accion={()=>vm.cambiar('lenta',v)}/>)}</View>
  </View>;
}
