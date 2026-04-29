import { api } from '../../lib/axios';
import type { ConfiguracaoJornadaWire } from '../../types/jornada';

export const jornadaApi = {
  async get(): Promise<ConfiguracaoJornadaWire> {
    const { data } = await api.get<ConfiguracaoJornadaWire>('/configuracao-jornada');
    return data;
  },
  async update(payload: ConfiguracaoJornadaWire): Promise<ConfiguracaoJornadaWire> {
    const { data } = await api.put<ConfiguracaoJornadaWire>('/configuracao-jornada', payload);
    return data;
  },
};
