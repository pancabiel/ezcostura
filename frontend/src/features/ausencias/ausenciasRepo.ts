import { v4 as uuid } from 'uuid';
import { db } from '../../db/dexie';
import type { AusenciaLocal, TipoAusencia } from '../../types/ausencia';

export const ausenciasRepo = {
  async list(): Promise<AusenciaLocal[]> {
    const all = await db.ausencias.toArray();
    return all
      .filter((a) => !a.pendingDelete)
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
  },

  async get(id: string): Promise<AusenciaLocal | undefined> {
    return db.ausencias.get(id);
  },

  async listActiveOn(data: string): Promise<AusenciaLocal[]> {
    const all = await db.ausencias.toArray();
    return all.filter(
      (a) => !a.pendingDelete && a.dataInicio <= data && a.dataFim >= data,
    );
  },

  async create(input: {
    operarioId: string;
    dataInicio: string;
    dataFim: string;
    tipo: TipoAusencia;
    observacao?: string;
  }): Promise<AusenciaLocal> {
    const a: AusenciaLocal = {
      ...input,
      id: uuid(),
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    };
    await db.ausencias.add(a);
    return a;
  },

  async update(id: string, patch: Partial<AusenciaLocal>): Promise<void> {
    const existing = await db.ausencias.get(id);
    if (!existing) return;
    await db.ausencias.put({
      ...existing,
      ...patch,
      id,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },

  async markDeleted(id: string): Promise<void> {
    const existing = await db.ausencias.get(id);
    if (!existing) return;
    if (!existing.serverId) {
      await db.ausencias.delete(id);
      return;
    }
    await db.ausencias.put({
      ...existing,
      pendingDelete: true,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },
};
