import { v4 as uuid } from 'uuid';
import { getDb } from '../../db/dexie';
import type {
  DiaEspecialLocal,
  JornadaEfetiva,
  JornadaLocal,
  PausaWire,
} from '../../types/jornada';

export const jornadasRepo = {
  async list(): Promise<JornadaLocal[]> {
    const all = await getDb().jornadas.toArray();
    return all.filter((j) => !j.pendingDelete).sort((a, b) => a.nome.localeCompare(b.nome));
  },
  async get(id: string): Promise<JornadaLocal | undefined> {
    return getDb().jornadas.get(id);
  },
  async create(input: Omit<JornadaLocal, 'id' | 'syncStatus' | 'updatedAt'>): Promise<JornadaLocal> {
    const j: JornadaLocal = {
      ...input,
      id: uuid(),
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    };
    await getDb().jornadas.add(j);
    return j;
  },
  async update(id: string, patch: Partial<JornadaLocal>): Promise<void> {
    const existing = await getDb().jornadas.get(id);
    if (!existing) return;
    await getDb().jornadas.put({
      ...existing,
      ...patch,
      id,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },
  async markDeleted(id: string): Promise<void> {
    const existing = await getDb().jornadas.get(id);
    if (!existing) return;
    if (!existing.serverId) {
      await getDb().jornadas.delete(id);
      return;
    }
    await getDb().jornadas.put({
      ...existing,
      pendingDelete: true,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },
};

export const diasEspeciaisRepo = {
  async list(): Promise<DiaEspecialLocal[]> {
    const all = await getDb().diasEspeciais.toArray();
    return all.filter((d) => !d.pendingDelete).sort((a, b) => b.data.localeCompare(a.data));
  },
  async create(input: Omit<DiaEspecialLocal, 'id' | 'syncStatus' | 'updatedAt'>): Promise<DiaEspecialLocal> {
    const d: DiaEspecialLocal = {
      ...input,
      id: uuid(),
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    };
    await getDb().diasEspeciais.add(d);
    return d;
  },
  async update(id: string, patch: Partial<DiaEspecialLocal>): Promise<void> {
    const existing = await getDb().diasEspeciais.get(id);
    if (!existing) return;
    await getDb().diasEspeciais.put({
      ...existing,
      ...patch,
      id,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },
  async markDeleted(id: string): Promise<void> {
    const existing = await getDb().diasEspeciais.get(id);
    if (!existing) return;
    if (!existing.serverId) {
      await getDb().diasEspeciais.delete(id);
      return;
    }
    await getDb().diasEspeciais.put({
      ...existing,
      pendingDelete: true,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
  },
};

export function normalizeTime(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = normalizeTime(start).split(':').map(Number);
  const [eh, em] = normalizeTime(end).split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function jornadaWorkingMinutes(efetiva: { horaInicio: string; horaFim: string; pausas: { horaInicio: string; horaFim: string }[] }): number {
  const total = minutesBetween(efetiva.horaInicio, efetiva.horaFim);
  const pausas = efetiva.pausas.reduce((s, p) => s + minutesBetween(p.horaInicio, p.horaFim), 0);
  return Math.max(0, total - pausas);
}

/**
 * Resolve a jornada efetiva de um operário em uma determinada data, considerando:
 * 1. Dia especial cuja lista de operarioIds contém o operário (prioridade máxima);
 * 2. Override de dia da semana na jornada do operário;
 * 3. Horário padrão da jornada do operário.
 */
export function resolverJornadaEfetiva(opts: {
  operarioId: string;
  data: string; // ISO YYYY-MM-DD
  jornadas: JornadaLocal[];
  diasEspeciais: DiaEspecialLocal[];
  jornadaIdDoOperario: string;
}): JornadaEfetiva | null {
  const { operarioId, data, jornadas, diasEspeciais, jornadaIdDoOperario } = opts;

  const especial = diasEspeciais.find(
    (d) => d.data === data && !d.pendingDelete && d.operarioIds.includes(operarioId),
  );
  if (especial) {
    return {
      horaInicio: normalizeTime(especial.horaInicio),
      horaFim: normalizeTime(especial.horaFim),
      pausas: especial.pausas.map((p) => ({
        nome: p.nome,
        horaInicio: normalizeTime(p.horaInicio),
        horaFim: normalizeTime(p.horaFim),
        tipo: p.tipo,
      })),
      origem: 'dia-especial',
    };
  }

  const jornada = jornadas.find((j) => j.id === jornadaIdDoOperario && !j.pendingDelete);
  if (!jornada) return null;

  // dia da semana 0=domingo .. 6=sábado
  const dow = new Date(data + 'T00:00:00').getDay();
  const override = jornada.diasSemana.find((d) => d.diaSemana === dow);
  let horaInicio = normalizeTime(jornada.horaInicio);
  let horaFim = normalizeTime(jornada.horaFim);
  let origem: JornadaEfetiva['origem'] = 'padrao';
  if (override) {
    horaInicio = normalizeTime(override.horaInicio);
    horaFim = normalizeTime(override.horaFim);
    origem = 'dia-semana';
  }

  // Pausas: se houver pausa específica para o dia da semana, usa só elas; senão usa as padrão (diaSemana=null).
  const pausasDoDia = jornada.pausas.filter((p) => p.diaSemana === dow);
  const pausasPadrao = jornada.pausas.filter((p) => p.diaSemana === null || p.diaSemana === undefined);
  const pausasFinais: PausaWire[] = pausasDoDia.length > 0 ? pausasDoDia : pausasPadrao;

  return {
    horaInicio,
    horaFim,
    pausas: pausasFinais.map((p) => ({
      nome: p.nome,
      horaInicio: normalizeTime(p.horaInicio),
      horaFim: normalizeTime(p.horaFim),
      tipo: p.tipo,
    })),
    origem,
  };
}

export function pausaAtiva(efetiva: JornadaEfetiva, now: Date): { nome: string; horaFim: string } | null {
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const cur = `${hh}:${mm}`;
  for (const p of efetiva.pausas) {
    if (p.horaInicio <= cur && cur < p.horaFim) {
      return { nome: p.nome, horaFim: p.horaFim };
    }
  }
  return null;
}
