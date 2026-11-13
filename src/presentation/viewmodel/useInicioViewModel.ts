// VIEWMODEL (piso 2) del arranque: prepara la agenda antes de mostrar la primera pantalla.
import {useEffect, useState} from 'react';
import {iniciar} from './useProgramaViewModel';

export type FaseInicio = 'abriendo' | 'lista' | 'error';

export function useInicioViewModel(taskKey: string, sinServicio: boolean) {
  const [fase, setFase] = useState<FaseInicio>('abriendo');
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vivo = true; // se apaga en la limpieza: si la pantalla ya no está, no se toca su estado
    setFase('abriendo');
    iniciar(taskKey, sinServicio)
      .then(() => { if (vivo) setFase('lista'); })
      .catch(() => { if (vivo) setFase('error'); });
    return () => { vivo = false; };
  }, [taskKey, sinServicio, intento]);
  return {fase, reintentar: () => setIntento(n => n + 1)};
}
