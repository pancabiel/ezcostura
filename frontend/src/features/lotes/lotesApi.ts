import { api } from '../../lib/axios';
import type { LoteWire } from '../../types/lote';

export const lotesApi = {
  async list(): Promise<LoteWire[]> {
    const { data } = await api.get<LoteWire[]>('/lotes');
    return data;
  },

  async create(payload: LoteWire): Promise<LoteWire> {
    const { data } = await api.post<LoteWire>('/lotes', payload);
    return data;
  },

  async update(id: string, payload: LoteWire): Promise<LoteWire> {
    const { data } = await api.put<LoteWire>(`/lotes/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/lotes/${id}`);
  },
};
