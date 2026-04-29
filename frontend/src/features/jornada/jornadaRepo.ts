import { db } from '../../db/dexie';
import type { ConfiguracaoJornadaWire } from '../../types/jornada';
import { jornadaApi } from './jornadaApi';

const SINGLETON: 'singleton' = 'singleton';

const DEFAULT_JORNADA: ConfiguracaoJornadaWire = {
  horaInicio: '07:00',
  horaFim: '17:00',
  pausas: [
    { nome: 'Café', horaInicio: '09:30', horaFim: '09:45', tipo: 'CAFE' },
    { nome: 'Almoço', horaInicio: '12:00', horaFim: '13:00', tipo: 'ALMOCO' },
    { nome: 'Café', horaInicio: '15:00', horaFim: '15:15', tipo: 'CAFE' },
  ],
};

export const jornadaRepo = {
  async getCached(): Promise<ConfiguracaoJornadaWire> {
    const row = await db.jornadaCache.get(SINGLETON);
    return row?.data ?? DEFAULT_JORNADA;
  },

  async refresh(): Promise<ConfiguracaoJornadaWire> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.getCached();
    }
    try {
      const remote = await jornadaApi.get();
      await db.jornadaCache.put({ id: SINGLETON, data: remote, updatedAt: new Date().toISOString() });
      return remote;
    } catch {
      return this.getCached();
    }
  },

  async save(payload: ConfiguracaoJornadaWire): Promise<ConfiguracaoJornadaWire> {
    const saved = await jornadaApi.update(payload);
    await db.jornadaCache.put({ id: SINGLETON, data: saved, updatedAt: new Date().toISOString() });
    return saved;
  },
};

export function normalizeTime(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = normalizeTime(start).split(':').map(Number);
  const [eh, em] = normalizeTime(end).split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

export function jornadaWorkingMinutes(c: ConfiguracaoJornadaWire): number {
  const total = minutesBetween(c.horaInicio, c.horaFim);
  const pausas = c.pausas.reduce((s, p) => s + minutesBetween(p.horaInicio, p.horaFim), 0);
  return Math.max(0, total - pausas);
}

export function pausaAtiva(c: ConfiguracaoJornadaWire, now: Date): { nome: string; horaFim: string } | null {
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const cur = `${hh}:${mm}`;
  for (const p of c.pausas) {
    if (normalizeTime(p.horaInicio) <= cur && cur < normalizeTime(p.horaFim)) {
      return { nome: p.nome, horaFim: normalizeTime(p.horaFim) };
    }
  }
  return null;
}
