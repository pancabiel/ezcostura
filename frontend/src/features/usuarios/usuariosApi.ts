import { api } from '../../lib/axios';
import type { CreateUsuarioPayload, UsuarioWire } from '../../types/usuario';

// Gestão de usuários é online-only (não passa pelo Dexie/sync): é uma operação
// administrativa rara e sensível, sempre feita com conexão.
export const usuariosApi = {
  async list(): Promise<UsuarioWire[]> {
    const { data } = await api.get<UsuarioWire[]>('/usuarios');
    return data;
  },
  async create(payload: CreateUsuarioPayload): Promise<UsuarioWire> {
    const { data } = await api.post<UsuarioWire>('/usuarios', payload);
    return data;
  },
  async setAtivo(id: string, ativo: boolean): Promise<UsuarioWire> {
    const { data } = await api.patch<UsuarioWire>(`/usuarios/${id}`, { ativo });
    return data;
  },
  async resetPassword(id: string, newPassword: string): Promise<void> {
    await api.post(`/usuarios/${id}/reset-password`, { newPassword });
  },
};
