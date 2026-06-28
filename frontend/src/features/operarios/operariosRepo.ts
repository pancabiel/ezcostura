import { v4 as uuid } from 'uuid';
import { getDb } from '../../db/dexie';
import type { OperarioLocal } from '../../types/operario';

export const operariosRepo = {
  async list(): Promise<OperarioLocal[]> {
    const all = await getDb().operarios.toArray();
    return all
      .filter((o) => !o.pendingDelete)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  },

  async listAtivos(): Promise<OperarioLocal[]> {
    const all = await this.list();
    return all.filter((o) => o.ativo);
  },

  async get(id: string): Promise<OperarioLocal | undefined> {
    return getDb().operarios.get(id);
  },

  async create(input: Omit<OperarioLocal, 'id' | 'syncStatus' | 'updatedAt'>): Promise<OperarioLocal> {
    const o: OperarioLocal = {
      ...input,
      id: uuid(),
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    };
    await getDb().operarios.add(o);
    return o;
  },

  async update(id: string, patch: Partial<OperarioLocal>): Promise<void> {
    const existing = await getDb().operarios.get(id);
    if (!existing) return;
    await getDb().operarios.put({
      ...existing,
      ...patch,
      id,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Atualiza só o flag de acesso ao portal localmente, sem marcar a linha como
   * 'pending' (o PIN é gerido por endpoints dedicados, não pela sync de operário).
   * Mantém o indicador da lista em dia imediatamente após resetar/remover acesso.
   */
  async setTemPin(id: string, temPin: boolean): Promise<void> {
    await getDb().operarios.update(id, { temPin });
  },

  async markDeleted(id: string): Promise<void> {
    const existing = await getDb().operarios.get(id);
    if (!existing) return;
    if (!existing.serverId) {
      await getDb().operarios.delete(id);
      return;
    }
    await getDb().operarios.put({
      ...existing,
      pendingDelete: true,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },
};
