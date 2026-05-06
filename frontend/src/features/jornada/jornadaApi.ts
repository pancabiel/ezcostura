import { api } from '../../lib/axios';
import type { JornadaWire, DiaEspecialWire } from '../../types/jornada';

export const jornadaApi = {
  async list(): Promise<JornadaWire[]> {
    const { data } = await api.get<JornadaWire[]>('/jornadas');
    return data;
  },
  async create(payload: JornadaWire): Promise<JornadaWire> {
    const { data } = await api.post<JornadaWire>('/jornadas', payload);
    return data;
  },
  async update(id: string, payload: JornadaWire): Promise<JornadaWire> {
    const { data } = await api.put<JornadaWire>(`/jornadas/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/jornadas/${id}`);
  },
};

export const diasEspeciaisApi = {
  async list(): Promise<DiaEspecialWire[]> {
    const { data } = await api.get<DiaEspecialWire[]>('/dias-especiais');
    return data;
  },
  async create(payload: DiaEspecialWire): Promise<DiaEspecialWire> {
    const { data } = await api.post<DiaEspecialWire>('/dias-especiais', payload);
    return data;
  },
  async update(id: string, payload: DiaEspecialWire): Promise<DiaEspecialWire> {
    const { data } = await api.put<DiaEspecialWire>(`/dias-especiais/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/dias-especiais/${id}`);
  },
};
