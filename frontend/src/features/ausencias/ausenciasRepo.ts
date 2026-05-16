import { v4 as uuid } from 'uuid';
import { getDb } from '../../db/dexie';
import type { AusenciaLocal, TipoAusencia } from '../../types/ausencia';

export const ausenciasRepo = {
  async list(): Promise<AusenciaLocal[]> {
    const all = await getDb().ausencias.toArray();
    return all
      .filter((a) => !a.pendingDelete)
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
  },

  async get(id: string): Promise<AusenciaLocal | undefined> {
    return getDb().ausencias.get(id);
  },

  async listActiveOn(data: string): Promise<AusenciaLocal[]> {
    const all = await getDb().ausencias.toArray();
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
    await getDb().ausencias.add(a);
    return a;
  },

  async update(id: string, patch: Partial<AusenciaLocal>): Promise<void> {
    const existing = await getDb().ausencias.get(id);
    if (!existing) return;
    await getDb().ausencias.put({
      ...existing,
      ...patch,
      id,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },

  async markDeleted(id: string): Promise<void> {
    const existing = await getDb().ausencias.get(id);
    if (!existing) return;
    if (!existing.serverId) {
      await getDb().ausencias.delete(id);
      return;
    }
    await getDb().ausencias.put({
      ...existing,
      pendingDelete: true,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },
};
