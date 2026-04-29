import { api } from '../../lib/axios';
import type { AusenciaWire } from '../../types/ausencia';

export const ausenciasApi = {
  async list(params?: { de?: string; ate?: string; operarioId?: string }): Promise<AusenciaWire[]> {
    const { data } = await api.get<AusenciaWire[]>('/ausencias', { params });
    return data;
  },
  async listForDate(data: string): Promise<AusenciaWire[]> {
    const r = await api.get<AusenciaWire[]>('/ausencias', { params: { data } });
    return r.data;
  },
  async create(payload: AusenciaWire): Promise<AusenciaWire> {
    const { data } = await api.post<AusenciaWire>('/ausencias', payload);
    return data;
  },
  async update(id: string, payload: AusenciaWire): Promise<AusenciaWire> {
    const { data } = await api.put<AusenciaWire>(`/ausencias/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/ausencias/${id}`);
  },
};
