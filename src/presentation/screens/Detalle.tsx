// PANTALLA (piso 1): la ficha de una charla. Antes estaba escrita dentro de App.tsx.
import React from 'react';
import {Text,View} from 'react-native';
import {Opcion,s} from '../components/componentes';
import {useProgramaViewModel} from '../viewmodel/useProgramaViewModel';

export function Detalle() {
  const vm = useProgramaViewModel();
  const ficha = vm.ficha;
  return <View><Opcion texto="Volver" accion={vm.cerrarFicha}/>
    {ficha ? <View><Text style={s.titulo}>{ficha.title}</Text><Text style={s.texto}>
        Día {ficha.day} · {ficha.time} · {ficha.room}</Text>
        <Text>{ficha.speaker}</Text><Text style={s.texto}>{ficha.summary}</Text>
        <Opcion texto={ficha.favorita?'Quitar de mi agenda':'Agregar a mi agenda'} accion={()=>vm.marcar(ficha.id)}/>
        {!!vm.avisoAgenda && <Text style={s.aviso}>{vm.avisoAgenda}</Text>}
      </View>
      : <Text style={s.texto}>Esta charla ya no figura en el programa.</Text>}
  </View>;
}
