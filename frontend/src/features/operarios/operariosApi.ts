import { api } from '../../lib/axios';
import type { OperarioWire } from '../../types/operario';

export const operariosApi = {
  async list(): Promise<OperarioWire[]> {
    const { data } = await api.get<OperarioWire[]>('/operarios');
    return data;
  },
  async create(payload: OperarioWire): Promise<OperarioWire> {
    const { data } = await api.post<OperarioWire>('/operarios', payload);
    return data;
  },
  async update(id: string, payload: OperarioWire): Promise<OperarioWire> {
    const { data } = await api.put<OperarioWire>(`/operarios/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/operarios/${id}`);
  },
};
