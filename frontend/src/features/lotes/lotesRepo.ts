import { v4 as uuid } from 'uuid';
import { db } from '../../db/dexie';
import type { LoteLocal } from '../../types/lote';

/**
 * Repository over the local Dexie store. All UI reads/writes go through here.
 * The sync service is the only consumer that reads `pendingDelete` / `syncStatus`
 * to decide what to push to the backend.
 */
export const lotesRepo = {
  async list(): Promise<LoteLocal[]> {
    const all = await db.lotes.toArray();
    return all
      .filter((l) => !l.pendingDelete)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  },

  async get(id: string): Promise<LoteLocal | undefined> {
    return db.lotes.get(id);
  },

  async create(input: Omit<LoteLocal, 'id' | 'syncStatus' | 'updatedAt'>): Promise<LoteLocal> {
    const lote: LoteLocal = {
      ...input,
      id: uuid(),
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    };
    await db.lotes.add(lote);
    return lote;
  },

  async update(id: string, patch: Partial<LoteLocal>): Promise<void> {
    const existing = await db.lotes.get(id);
    if (!existing) return;
    await db.lotes.put({
      ...existing,
      ...patch,
      id,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },

  async markDeleted(id: string): Promise<void> {
    const existing = await db.lotes.get(id);
    if (!existing) return;
    if (!existing.serverId) {
      // never synced — safe to drop locally
      await db.lotes.delete(id);
      return;
    }
    await db.lotes.put({
      ...existing,
      pendingDelete: true,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },
};
