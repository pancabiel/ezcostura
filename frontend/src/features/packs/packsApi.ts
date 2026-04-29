import { api } from '../../lib/axios';
import type { PackWire } from '../../types/pack';

export const packsApi = {
  async listByData(data: string, operarioId?: string): Promise<PackWire[]> {
    const params: Record<string, string> = { data };
    if (operarioId) params.operarioId = operarioId;
    const { data: rows } = await api.get<PackWire[]>('/packs', { params });
    return rows;
  },
  async create(payload: PackWire): Promise<PackWire> {
    const { data } = await api.post<PackWire>('/packs', payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/packs/${id}`);
  },
};
