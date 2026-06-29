import { getDb, hasDbForCurrentSession } from '../db/dexie';
import { lotesApi } from '../features/lotes/lotesApi';
import { operariosApi } from '../features/operarios/operariosApi';
import { alocacoesApi } from '../features/alocacoes/alocacoesApi';
import { packsApi } from '../features/packs/packsApi';
import { ausenciasApi } from '../features/ausencias/ausenciasApi';
import { jornadaApi, diasEspeciaisApi } from '../features/jornada/jornadaApi';
import { useSyncStore } from '../stores/syncStore';
import { getSession } from '../stores/authStore';
import type { LoteLocal, LoteWire } from '../types/lote';
import type { OperarioLocal, OperarioWire } from '../types/operario';
import type { AlocacaoLocal, AlocacaoWire } from '../types/alocacao';
import type { PackLocal, PackWire } from '../types/pack';
import type { AusenciaLocal, AusenciaWire } from '../types/ausencia';
import type { DiaEspecialLocal, DiaEspecialWire, JornadaLocal, JornadaWire } from '../types/jornada';

const SYNC_INTERVAL_MS = 5_000;
let started = false;
let timer: ReturnType<typeof setTimeout> | undefined;

export function startSyncService() {
  if (started) return;
  started = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      useSyncStore.getState().setConnection('online');
      void runOnce();
    });
    window.addEventListener('offline', () => {
      useSyncStore.getState().setConnection('offline');
    });
  }

  void runOnce();
}

export function stopSyncService() {
  started = false;
  if (timer) clearTimeout(timer);
}

async function runOnce(): Promise<void> {
  try {
    if (!getSession()) {
      await refreshPendingCount();
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await refreshPendingCount();
      return;
    }
    useSyncStore.getState().setPhase('syncing');

    await pushJornadas();
    await pushLotes();
    await pushOperarios();
    await pushDiasEspeciais();
    await pushAlocacoes();
    await pushPacks();
    await pushAusencias();

    await pullJornadas();
    await pullLotes();
    await pullOperarios();
    await pullDiasEspeciais();
    await pullAusencias();
    // Alocações and packs are date-scoped; the relevant pages pull on demand.

    await refreshPendingCount();
    useSyncStore.getState().markSynced();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    useSyncStore.getState().setPhase('error', msg);
    await refreshPendingCount();
  } finally {
    if (started) {
      timer = setTimeout(() => void runOnce(), SYNC_INTERVAL_MS);
    }
  }
}

async function pushJornadas() {
  const db = getDb();
  const pending = await db.jornadas.where('syncStatus').equals('pending').toArray();
  for (const local of pending) {
    try {
      if (local.pendingDelete) {
        if (local.serverId) await jornadaApi.remove(local.serverId);
        await db.jornadas.delete(local.id);
        continue;
      }
      const payload: JornadaWire = {
        id: local.serverId ?? local.id,
        nome: local.nome,
        horaInicio: local.horaInicio,
        horaFim: local.horaFim,
        pausas: local.pausas,
        diasSemana: local.diasSemana,
      };
      const saved = local.serverId
        ? await jornadaApi.update(local.serverId, payload)
        : await jornadaApi.create(payload);
      await db.jornadas.update(local.id, { serverId: saved.id, syncStatus: 'synced', syncError: undefined });
    } catch (err) {
      await markError(db.jornadas, local.id, err);
    }
  }
}

async function pushLotes() {
  const db = getDb();
  const pending = await db.lotes.where('syncStatus').equals('pending').toArray();
  for (const local of pending) {
    try {
      if (local.pendingDelete) {
        if (local.serverId) await lotesApi.remove(local.serverId);
        await db.lotes.delete(local.id);
        continue;
      }
      const payload: LoteWire = {
        id: local.serverId ?? local.id,
        codigo: local.codigo,
        nome: local.nome,
        descricao: local.descricao,
        finalizado: local.finalizado ?? false,
        operacoes: local.operacoes,
        tamanhos: local.tamanhos,
      };
      const saved = local.serverId
        ? await lotesApi.update(local.serverId, payload)
        : await lotesApi.create(payload);
      await db.lotes.update(local.id, { serverId: saved.id, syncStatus: 'synced', syncError: undefined });
    } catch (err) {
      await markError(db.lotes, local.id, err);
    }
  }
}

async function pushOperarios() {
  const db = getDb();
  const pending = await db.operarios.where('syncStatus').equals('pending').toArray();
  for (const local of pending) {
    try {
      if (local.pendingDelete) {
        if (local.serverId) await operariosApi.remove(local.serverId);
        await db.operarios.delete(local.id);
        continue;
      }
      const jornada = await db.jornadas.get(local.jornadaId);
      const payload: OperarioWire = {
        id: local.serverId ?? local.id,
        nome: local.nome,
        cpf: local.cpf,
        telefone: local.telefone,
        dataAdmissao: local.dataAdmissao,
        ativo: local.ativo,
        jornadaId: jornada?.serverId ?? local.jornadaId,
      };
      const saved = local.serverId
        ? await operariosApi.update(local.serverId, payload)
        : await operariosApi.create(payload);
      await db.operarios.update(local.id, { serverId: saved.id, syncStatus: 'synced', syncError: undefined });
    } catch (err) {
      await markError(db.operarios, local.id, err);
    }
  }
}

async function pushDiasEspeciais() {
  const db = getDb();
  const pending = await db.diasEspeciais.where('syncStatus').equals('pending').toArray();
  for (const local of pending) {
    try {
      if (local.pendingDelete) {
        if (local.serverId) await diasEspeciaisApi.remove(local.serverId);
        await db.diasEspeciais.delete(local.id);
        continue;
      }
      const operarios = await db.operarios.toArray();
      const localToServer = new Map(operarios.map((o) => [o.id, o.serverId ?? o.id]));
      const payload: DiaEspecialWire = {
        id: local.serverId ?? local.id,
        data: local.data,
        descricao: local.descricao,
        horaInicio: local.horaInicio,
        horaFim: local.horaFim,
        pausas: local.pausas,
        operarioIds: local.operarioIds.map((id) => localToServer.get(id) ?? id),
      };
      const saved = local.serverId
        ? await diasEspeciaisApi.update(local.serverId, payload)
        : await diasEspeciaisApi.create(payload);
      await db.diasEspeciais.update(local.id, { serverId: saved.id, syncStatus: 'synced', syncError: undefined });
    } catch (err) {
      await markError(db.diasEspeciais, local.id, err);
    }
  }
}

async function pushAlocacoes() {
  const db = getDb();
  const pending = await db.alocacoes.where('syncStatus').equals('pending').toArray();
  for (const local of pending) {
    try {
      if (local.pendingDelete) {
        if (local.serverId) await alocacoesApi.remove(local.serverId);
        await db.alocacoes.delete(local.id);
        continue;
      }
      const payload: AlocacaoWire = {
        id: local.serverId ?? local.id,
        operarioId: serverIdOrLocal(await db.operarios.get(local.operarioId), local.operarioId),
        data: local.data,
        horarioInicio: local.horarioInicio,
        loteId: serverIdOrLocal(await db.lotes.get(local.loteId), local.loteId),
        operacaoId: local.operacaoId,
      };
      const saved = local.serverId
        ? await alocacoesApi.update(local.serverId, payload)
        : await alocacoesApi.create(payload);
      await db.alocacoes.update(local.id, { serverId: saved.id, syncStatus: 'synced', syncError: undefined });
    } catch (err) {
      await markError(db.alocacoes, local.id, err);
    }
  }
}

async function pushPacks() {
  const db = getDb();
  const pending = await db.packs.where('syncStatus').equals('pending').toArray();
  for (const local of pending) {
    try {
      if (local.pendingDelete) {
        if (local.serverId) await packsApi.remove(local.serverId);
        await db.packs.delete(local.id);
        continue;
      }
      const payload: PackWire = {
        id: local.serverId ?? local.id,
        operarioId: serverIdOrLocal(await db.operarios.get(local.operarioId), local.operarioId),
        data: local.data,
        horario: local.horario,
        alocacaoId: serverIdOrLocal(await db.alocacoes.get(local.alocacaoId), local.alocacaoId),
        loteId: serverIdOrLocal(await db.lotes.get(local.loteId), local.loteId),
        operacaoId: local.operacaoId,
        loteCodigo: local.loteCodigo,
        operacaoNome: local.operacaoNome,
        quantidade: local.quantidade,
        tamanho: local.tamanho,
        registradoPor: local.registradoPor,
      };
      const saved = await packsApi.create(payload);
      await db.packs.update(local.id, { serverId: saved.id, syncStatus: 'synced', syncError: undefined });
    } catch (err) {
      await markError(db.packs, local.id, err);
    }
  }
}

async function pushAusencias() {
  const db = getDb();
  const pending = await db.ausencias.where('syncStatus').equals('pending').toArray();
  for (const local of pending) {
    try {
      if (local.pendingDelete) {
        if (local.serverId) await ausenciasApi.remove(local.serverId);
        await db.ausencias.delete(local.id);
        continue;
      }
      const payload: AusenciaWire = {
        id: local.serverId ?? local.id,
        operarioId: serverIdOrLocal(await db.operarios.get(local.operarioId), local.operarioId),
        dataInicio: local.dataInicio,
        dataFim: local.dataFim,
        tipo: local.tipo,
        observacao: local.observacao,
      };
      const saved = local.serverId
        ? await ausenciasApi.update(local.serverId, payload)
        : await ausenciasApi.create(payload);
      await db.ausencias.update(local.id, { serverId: saved.id, syncStatus: 'synced', syncError: undefined });
    } catch (err) {
      await markError(db.ausencias, local.id, err);
    }
  }
}

async function pullJornadas() {
  const db = getDb();
  const remote = await jornadaApi.list();
  const localByServer = new Map<string, JornadaLocal>();
  for (const j of await db.jornadas.toArray()) if (j.serverId) localByServer.set(j.serverId, j);
  for (const r of remote) {
    const existing = localByServer.get(r.id);
    if (!existing) {
      await db.jornadas.add({
        id: r.id, serverId: r.id,
        nome: r.nome,
        horaInicio: r.horaInicio, horaFim: r.horaFim,
        pausas: r.pausas, diasSemana: r.diasSemana,
        syncStatus: 'synced', updatedAt: r.updatedAt ?? new Date().toISOString(),
      });
    } else if (existing.syncStatus === 'synced') {
      await db.jornadas.put({
        ...existing,
        nome: r.nome,
        horaInicio: r.horaInicio, horaFim: r.horaFim,
        pausas: r.pausas, diasSemana: r.diasSemana,
        updatedAt: r.updatedAt ?? existing.updatedAt,
      });
    }
  }
}

async function pullDiasEspeciais() {
  const db = getDb();
  const remote = await diasEspeciaisApi.list();
  const localByServer = new Map<string, DiaEspecialLocal>();
  for (const d of await db.diasEspeciais.toArray()) if (d.serverId) localByServer.set(d.serverId, d);
  for (const r of remote) {
    const localOpIds: string[] = [];
    for (const opServerId of r.operarioIds) {
      const op = await findLocalByServerId(db.operarios, opServerId);
      localOpIds.push(op?.id ?? opServerId);
    }
    const existing = localByServer.get(r.id);
    if (!existing) {
      await db.diasEspeciais.add({
        id: r.id, serverId: r.id,
        data: r.data, descricao: r.descricao,
        horaInicio: r.horaInicio, horaFim: r.horaFim,
        pausas: r.pausas, operarioIds: localOpIds,
        syncStatus: 'synced', updatedAt: r.updatedAt ?? new Date().toISOString(),
      });
    } else if (existing.syncStatus === 'synced') {
      await db.diasEspeciais.put({
        ...existing,
        data: r.data, descricao: r.descricao,
        horaInicio: r.horaInicio, horaFim: r.horaFim,
        pausas: r.pausas, operarioIds: localOpIds,
        updatedAt: r.updatedAt ?? existing.updatedAt,
      });
    }
  }
}

async function pullAusencias() {
  const db = getDb();
  const remote = await ausenciasApi.list();
  const localByServer = new Map<string, AusenciaLocal>();
  for (const a of await db.ausencias.toArray()) if (a.serverId) localByServer.set(a.serverId, a);
  for (const r of remote) {
    const operario = await findLocalByServerId(db.operarios, r.operarioId);
    const localOperarioId = operario?.id ?? r.operarioId;
    const existing = localByServer.get(r.id);
    if (!existing) {
      await db.ausencias.add({
        id: r.id, serverId: r.id,
        operarioId: localOperarioId,
        dataInicio: r.dataInicio, dataFim: r.dataFim,
        tipo: r.tipo, observacao: r.observacao,
        syncStatus: 'synced', updatedAt: new Date().toISOString(),
      });
    } else if (existing.syncStatus === 'synced') {
      await db.ausencias.put({
        ...existing,
        operarioId: localOperarioId,
        dataInicio: r.dataInicio, dataFim: r.dataFim,
        tipo: r.tipo, observacao: r.observacao,
      });
    }
  }
}

async function pullLotes() {
  const db = getDb();
  const remote = await lotesApi.list();
  const localByServer = new Map<string, LoteLocal>();
  for (const l of await db.lotes.toArray()) if (l.serverId) localByServer.set(l.serverId, l);
  for (const r of remote) {
    const existing = localByServer.get(r.id);
    if (!existing) {
      await db.lotes.add({
        id: r.id, serverId: r.id,
        codigo: r.codigo, nome: r.nome, descricao: r.descricao,
        finalizado: r.finalizado ?? false,
        operacoes: r.operacoes, tamanhos: r.tamanhos,
        syncStatus: 'synced',
        createdAt: r.createdAt ?? r.updatedAt ?? new Date().toISOString(),
        updatedAt: r.updatedAt ?? new Date().toISOString(),
      });
    } else if (existing.syncStatus === 'synced') {
      await db.lotes.put({
        ...existing,
        codigo: r.codigo, nome: r.nome, descricao: r.descricao,
        finalizado: r.finalizado ?? false,
        operacoes: r.operacoes, tamanhos: r.tamanhos,
        createdAt: existing.createdAt ?? r.createdAt ?? r.updatedAt,
        updatedAt: r.updatedAt ?? existing.updatedAt,
      });
    }
  }
}

async function pullOperarios() {
  const db = getDb();
  const remote = await operariosApi.list();
  const localByServer = new Map<string, OperarioLocal>();
  for (const o of await db.operarios.toArray()) if (o.serverId) localByServer.set(o.serverId, o);
  for (const r of remote) {
    const jornada = await findLocalByServerId(db.jornadas, r.jornadaId);
    const localJornadaId = jornada?.id ?? r.jornadaId;
    const existing = localByServer.get(r.id);
    if (!existing) {
      await db.operarios.add({
        id: r.id, serverId: r.id,
        nome: r.nome, cpf: r.cpf, telefone: r.telefone,
        dataAdmissao: r.dataAdmissao, ativo: r.ativo,
        jornadaId: localJornadaId, temPin: r.temPin,
        syncStatus: 'synced', updatedAt: r.updatedAt ?? new Date().toISOString(),
      });
    } else if (existing.syncStatus === 'synced') {
      await db.operarios.put({
        ...existing,
        nome: r.nome, cpf: r.cpf, telefone: r.telefone,
        dataAdmissao: r.dataAdmissao, ativo: r.ativo,
        jornadaId: localJornadaId, temPin: r.temPin,
        updatedAt: r.updatedAt ?? existing.updatedAt,
      });
    }
  }
}

// Date-scoped pulls are fire-and-forget from page useEffects. Dexie already has
// the last-synced data, so a failed pull is benign — swallow & log instead of
// surfacing as an unhandled rejection (e.g. when an in-flight request resolves
// after logout/unmount).
async function safePull(label: string, fn: () => Promise<void>) {
  if (!getSession() || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
  try {
    await fn();
  } catch (err) {
    console.warn(`[sync] ${label} failed:`, err);
  }
}

/** Pull alocações for a specific date — called by pages when they mount/change date. */
export async function pullAlocacoesForDate(data: string) {
  await safePull('pullAlocacoesForDate', async () => {
    const remote = await alocacoesApi.listByData(data);
    await reconcileAlocacoes(remote);
  });
}

export async function pullPacksForDate(data: string) {
  await safePull('pullPacksForDate', async () => {
    const remote = await packsApi.listByData(data);
    await reconcilePacks(remote);
  });
}

export async function pullAlocacoesForRange(inicio: string, fim: string) {
  await safePull('pullAlocacoesForRange', async () => {
    const remote = await alocacoesApi.listByDataRange(inicio, fim);
    await reconcileAlocacoes(remote);
  });
}

export async function pullPacksForRange(inicio: string, fim: string) {
  await safePull('pullPacksForRange', async () => {
    const remote = await packsApi.listByDataRange(inicio, fim);
    await reconcilePacks(remote);
  });
}

async function reconcileAlocacoes(remote: AlocacaoWire[]) {
  const db = getDb();
  const localByServer = new Map<string, AlocacaoLocal>();
  for (const a of await db.alocacoes.toArray()) if (a.serverId) localByServer.set(a.serverId, a);
  for (const r of remote) {
    const existing = localByServer.get(r.id);
    if (!existing) {
      const operario = await findLocalByServerId(db.operarios, r.operarioId);
      const lote = await findLocalByServerId(db.lotes, r.loteId);
      await db.alocacoes.add({
        id: r.id, serverId: r.id,
        operarioId: operario?.id ?? r.operarioId,
        data: r.data, horarioInicio: r.horarioInicio,
        loteId: lote?.id ?? r.loteId,
        operacaoId: r.operacaoId,
        syncStatus: 'synced', updatedAt: new Date().toISOString(),
      });
    } else if (existing.syncStatus === 'synced') {
      await db.alocacoes.put({
        ...existing,
        data: r.data, horarioInicio: r.horarioInicio,
        operacaoId: r.operacaoId,
      });
    }
  }
}

async function reconcilePacks(remote: PackWire[]) {
  const db = getDb();
  const localByServer = new Map<string, PackLocal>();
  for (const p of await db.packs.toArray()) if (p.serverId) localByServer.set(p.serverId, p);
  for (const r of remote) {
    if (localByServer.has(r.id)) continue;
    const operario = await findLocalByServerId(db.operarios, r.operarioId);
    const aloc = await findLocalByServerId(db.alocacoes, r.alocacaoId);
    const lote = await findLocalByServerId(db.lotes, r.loteId);
    await db.packs.add({
      id: r.id, serverId: r.id,
      operarioId: operario?.id ?? r.operarioId,
      data: r.data, horario: r.horario,
      alocacaoId: aloc?.id ?? r.alocacaoId,
      loteId: lote?.id ?? r.loteId,
      operacaoId: r.operacaoId,
      loteCodigo: r.loteCodigo,
      operacaoNome: r.operacaoNome,
      quantidade: r.quantidade, tamanho: r.tamanho, registradoPor: r.registradoPor,
      syncStatus: 'synced', updatedAt: new Date().toISOString(),
    });
  }
}

async function findLocalByServerId<T extends { id: string; serverId?: string }>(
  table: import('dexie').Table<T, string>,
  serverId: string,
): Promise<T | undefined> {
  return table.where('serverId').equals(serverId).first();
}

function serverIdOrLocal<T extends { serverId?: string }>(local: T | undefined, fallback: string): string {
  return local?.serverId ?? fallback;
}

async function markError<T>(table: import('dexie').Table<T, string>, id: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  await (table as unknown as import('dexie').Table<{ syncStatus: string; syncError?: string }, string>)
    .update(id, { syncStatus: 'error', syncError: msg });
}

async function refreshPendingCount(): Promise<void> {
  if (!hasDbForCurrentSession()) {
    useSyncStore.getState().setPendingCount(0);
    return;
  }
  const db = getDb();
  const counts = await Promise.all([
    db.lotes.where('syncStatus').equals('pending').count(),
    db.operarios.where('syncStatus').equals('pending').count(),
    db.alocacoes.where('syncStatus').equals('pending').count(),
    db.packs.where('syncStatus').equals('pending').count(),
    db.ausencias.where('syncStatus').equals('pending').count(),
    db.jornadas.where('syncStatus').equals('pending').count(),
    db.diasEspeciais.where('syncStatus').equals('pending').count(),
  ]);
  useSyncStore.getState().setPendingCount(counts.reduce((a, b) => a + b, 0));
}

export function syncNow() {
  void runOnce();
}
