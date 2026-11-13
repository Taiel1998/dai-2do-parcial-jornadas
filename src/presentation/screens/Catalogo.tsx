// PANTALLA (piso 1): el programa con sus filtros. Solo dibuja lo que dice el ViewModel.
// Ya no pide datos al aparecer ni guarda filtros propios: por eso rotar o volver
// de una ficha no repite descargas ni pierde lo elegido.
import React from 'react';
import {Text,View} from 'react-native';
import {DIAS,TEMAS} from '../../domain/charla';
import {Lista,Opcion,s} from '../components/componentes';
import {useProgramaViewModel} from '../viewmodel/useProgramaViewModel';

export function Catalogo() {
  const vm = useProgramaViewModel();
  return <View>
    <View style={s.fila}>{DIAS.map((t,i)=>
      <Opcion key={t} texto={t} activa={vm.dia===i} accion={()=>vm.elegirDia(i)}/>)}</View>
    <View style={s.fila}>{TEMAS.map(t=>
      <Opcion key={t} texto={t} activa={vm.tema===t} accion={()=>vm.elegirTema(t)}/>)}</View>
    <Opcion texto="Actualizar" accion={vm.actualizar}/>
    {vm.fase==='cargando' && <Text>Consultando programa…</Text>}
    {vm.fase==='error' && !vm.hayEdicion && <Opcion texto="Reintentar" accion={vm.actualizar}/>}
    {vm.hayEdicion && !vm.charlas.length && <Text style={s.texto}>Esta edición llegó sin charlas programadas.</Text>}
    {vm.charlas.length>0 && !vm.visibles.length && <Text style={s.texto}>No hay charlas para estos filtros.</Text>}
    <Lista fichas={vm.visibles} abrir={vm.abrirFicha}/>
  </View>;
}
