import { api } from '../../lib/axios';
import type { AlocacaoWire } from '../../types/alocacao';

export const alocacoesApi = {
  async listByData(data: string): Promise<AlocacaoWire[]> {
    const { data: rows } = await api.get<AlocacaoWire[]>('/alocacoes', { params: { data } });
    return rows;
  },
  async create(payload: AlocacaoWire): Promise<AlocacaoWire> {
    const { data } = await api.post<AlocacaoWire>('/alocacoes', payload);
    return data;
  },
  async update(id: string, payload: AlocacaoWire): Promise<AlocacaoWire> {
    const { data } = await api.put<AlocacaoWire>(`/alocacoes/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/alocacoes/${id}`);
  },
};
