// PANTALLA (piso 1): las charlas que el usuario marcó. Antes estaba escrita dentro de App.tsx.
import React from 'react';
import {Text,View} from 'react-native';
import {Lista} from '../components/componentes';
import {useProgramaViewModel} from '../viewmodel/useProgramaViewModel';

export function MiAgenda() {
  const vm = useProgramaViewModel();
  return <View>
    {!vm.agenda.length && <Text>Todavía no agregaste charlas.</Text>}
    <Lista fichas={vm.agenda} abrir={vm.abrirFicha}/></View>;
}
