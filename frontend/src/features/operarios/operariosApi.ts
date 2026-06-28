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
  /** Define/redefine o PIN do portal do operário (acesso). */
  async setPin(id: string, pin: string): Promise<void> {
    await api.post(`/operarios/${id}/pin`, { pin });
  },
  /** Remove o acesso ao portal (apaga o PIN). */
  async removePin(id: string): Promise<void> {
    await api.delete(`/operarios/${id}/pin`);
  },
};
