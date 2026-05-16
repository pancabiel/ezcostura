import { v4 as uuid } from 'uuid';
import { getDb } from '../../db/dexie';
import type { AlocacaoLocal } from '../../types/alocacao';

export const alocacoesRepo = {
  async listByData(data: string): Promise<AlocacaoLocal[]> {
    const all = await getDb().alocacoes.where('data').equals(data).toArray();
    return all
      .filter((a) => !a.pendingDelete)
      .sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio));
  },

  async listByOperarioAndData(operarioId: string, data: string): Promise<AlocacaoLocal[]> {
    const rows = await getDb().alocacoes.where('[operarioId+data]').equals([operarioId, data]).toArray();
    return rows
      .filter((a) => !a.pendingDelete)
      .sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio));
  },

  async get(id: string): Promise<AlocacaoLocal | undefined> {
    return getDb().alocacoes.get(id);
  },

  async create(input: Omit<AlocacaoLocal, 'id' | 'syncStatus' | 'updatedAt'>): Promise<AlocacaoLocal> {
    const a: AlocacaoLocal = {
      ...input,
      id: uuid(),
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    };
    await getDb().alocacoes.add(a);
    return a;
  },

  async update(id: string, patch: Partial<AlocacaoLocal>): Promise<void> {
    const existing = await getDb().alocacoes.get(id);
    if (!existing) return;
    await getDb().alocacoes.put({
      ...existing,
      ...patch,
      id,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },

  async markDeleted(id: string): Promise<void> {
    const existing = await getDb().alocacoes.get(id);
    if (!existing) return;
    if (!existing.serverId) {
      await getDb().alocacoes.delete(id);
      return;
    }
    await getDb().alocacoes.put({
      ...existing,
      pendingDelete: true,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },

  /** Vigente = última cujo horárioInicio ≤ now (HH:mm). */
  pickVigente(alocacoes: AlocacaoLocal[], now: Date): AlocacaoLocal | undefined {
    if (alocacoes.length === 0) return undefined;
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const past = alocacoes.filter((a) => a.horarioInicio <= hhmm);
    if (past.length === 0) return alocacoes[0];
    return past[past.length - 1];
  },
};
