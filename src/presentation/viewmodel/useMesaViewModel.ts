// VIEWMODEL (piso 2) de la Mesa: lee y cambia los ajustes del servicio de prueba.
import {useEffect, useState} from 'react';
import {agendaRepository as repo} from '../../data/AgendaRepository';
import {Ajustes, ClaveAjuste} from '../../domain/ajustes';
import {useProgramaViewModel} from './useProgramaViewModel';

export function useMesaViewModel() {
  const {fase, descargas} = useProgramaViewModel();
  const [valores, setValores] = useState<Partial<Ajustes>>({});
  const [solicitudes, setSolicitudes] = useState(0);
  const [aviso, setAviso] = useState('');

  // Montaje: lee los ajustes guardados. Limpieza: si la Mesa se cerró, no se toca su estado.
  useEffect(() => {
    let vivo = true;
    repo.leerAjustes()
      .then(leidos => { if (vivo) setValores(leidos); })
      .catch(() => { if (vivo) setAviso('No se pudieron leer los ajustes.'); });
    return () => { vivo = false; };
  }, []);

  // Al abrir la Mesa y cada vez que empieza o termina una descarga, se relee el contador.
  useEffect(() => { setSolicitudes(repo.solicitudesEnSesion()); }, [fase, descargas]);

  async function cambiar(clave: ClaveAjuste, valor: string) {
    try {
      await repo.cambiarAjuste(clave, valor);
      setValores(previos => ({...previos, [clave]: valor}));
      setAviso('');
    } catch {
      setAviso('No se pudo guardar el ajuste.');
    }
  }

  return {valores, solicitudes, aviso, cambiar};
}
