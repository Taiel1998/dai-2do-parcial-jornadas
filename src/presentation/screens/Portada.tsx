// PANTALLA (piso 1): el marco de la app. Muestra la pestaña o la ficha que diga el ViewModel.
import React,{useEffect} from 'react';
import {BackHandler,ScrollView,Text,View} from 'react-native';
import {SECCIONES} from '../../domain/lectura';
import {Opcion,s} from '../components/componentes';
import {useProgramaViewModel} from '../viewmodel/useProgramaViewModel';
import {Catalogo} from './Catalogo';
import {Detalle} from './Detalle';
import {Mesa} from './Mesa';
import {MiAgenda} from './MiAgenda';

export function Portada() {
  const vm = useProgramaViewModel();
  const retroceder = vm.retroceder;
  // Montaje: empieza a escuchar el botón "atrás". Desmontaje: deja de escuchar.
  useEffect(()=>{
    const sub = BackHandler.addEventListener('hardwareBackPress',retroceder);
    return ()=>sub.remove();
  },[retroceder]);
  return <View style={s.pagina}><Text>Jornadas del Sur</Text>
    <Text style={s.titulo}>{vm.fichaId?'Detalle':vm.seccion}</Text>
    {!!vm.aviso && <Text style={s.aviso}>{vm.aviso}</Text>}
    <ScrollView style={s.cuerpo}>
      {vm.fichaId ? <Detalle/>
      : vm.seccion==='Programa' ? <Catalogo/>
      : vm.seccion==='Mesa' ? <Mesa/> : <MiAgenda/>}
    </ScrollView>
    {!vm.fichaId && <View style={s.fila}>{SECCIONES.map(t=>
      <Opcion key={t} texto={t} activa={vm.seccion===t} accion={()=>vm.elegirSeccion(t)}/>)}</View>}
  </View>;
}
