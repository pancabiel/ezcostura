import { v4 as uuid } from 'uuid';
import { db } from '../../db/dexie';
import type { OperarioLocal } from '../../types/operario';

export const operariosRepo = {
  async list(): Promise<OperarioLocal[]> {
    const all = await db.operarios.toArray();
    return all
      .filter((o) => !o.pendingDelete)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  },

  async listAtivos(): Promise<OperarioLocal[]> {
    const all = await this.list();
    return all.filter((o) => o.ativo);
  },

  async get(id: string): Promise<OperarioLocal | undefined> {
    return db.operarios.get(id);
  },

  async create(input: Omit<OperarioLocal, 'id' | 'syncStatus' | 'updatedAt'>): Promise<OperarioLocal> {
    const o: OperarioLocal = {
      ...input,
      id: uuid(),
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    };
    await db.operarios.add(o);
    return o;
  },

  async update(id: string, patch: Partial<OperarioLocal>): Promise<void> {
    const existing = await db.operarios.get(id);
    if (!existing) return;
    await db.operarios.put({
      ...existing,
      ...patch,
      id,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },

  async markDeleted(id: string): Promise<void> {
    const existing = await db.operarios.get(id);
    if (!existing) return;
    if (!existing.serverId) {
      await db.operarios.delete(id);
      return;
    }
    await db.operarios.put({
      ...existing,
      pendingDelete: true,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },
};
