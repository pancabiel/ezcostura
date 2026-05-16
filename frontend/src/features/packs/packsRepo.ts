import { v4 as uuid } from 'uuid';
import { getDb } from '../../db/dexie';
import type { PackLocal } from '../../types/pack';

export const packsRepo = {
  async listByData(data: string): Promise<PackLocal[]> {
    const all = await getDb().packs.where('data').equals(data).toArray();
    return all
      .filter((p) => !p.pendingDelete)
      .sort((a, b) => a.horario.localeCompare(b.horario));
  },

  async listByOperarioAndData(operarioId: string, data: string): Promise<PackLocal[]> {
    const rows = await getDb().packs.where('[operarioId+data]').equals([operarioId, data]).toArray();
    return rows
      .filter((p) => !p.pendingDelete)
      .sort((a, b) => a.horario.localeCompare(b.horario));
  },

  async create(input: Omit<PackLocal, 'id' | 'syncStatus' | 'updatedAt'>): Promise<PackLocal> {
    const p: PackLocal = {
      ...input,
      id: uuid(),
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    };
    await getDb().packs.add(p);
    return p;
  },

  async markDeleted(id: string): Promise<void> {
    const existing = await getDb().packs.get(id);
    if (!existing) return;
    if (!existing.serverId) {
      await getDb().packs.delete(id);
      return;
    }
    await getDb().packs.put({
      ...existing,
      pendingDelete: true,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },
};
