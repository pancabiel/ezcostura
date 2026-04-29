import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { api } from '../../lib/axios';
import { db } from '../../db/dexie';
import { pullAlocacoesForDate, pullPacksForDate } from '../../services/syncService';
import { normalizeTime } from '../jornada/jornadaRepo';

interface ProducaoOperarioDia {
  operarioId: string;
  data: string;
  total: number;
}

interface ProducaoLote {
  loteId: string;
  total: number;
}

const DEFAULT_SHIFT_START_MIN = 7 * 60;
const DEFAULT_SHIFT_END_MIN = 18 * 60;

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};
const fmtDayMonth = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};
const overlapMin = (a1: number, a2: number, b1: number, b2: number) =>
  Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

function pctBadge(pct: number) {
  if (pct >= 100) return 'bg-emerald-100 text-emerald-700';
  if (pct >= 75) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}
function pctBar(pct: number) {
  if (pct >= 100) return 'bg-emerald-500';
  if (pct >= 75) return 'bg-amber-500';
  return 'bg-rose-500';
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function VBars({ data, color = '#10b981' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1 h-48">
      {data.map((d, i) => {
        const h = (d.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1 min-w-0">
            <span className="text-[10px] text-slate-500">{d.value || ''}</span>
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${h}%`,
                background: color,
                minHeight: d.value > 0 ? 2 : 0,
              }}
              title={`${d.label}: ${d.value}`}
            />
            <span className="text-[10px] text-slate-500 truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function HBars({ data, color = '#0f766e' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="text-sm text-slate-500">Sem dados.</p>;
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const w = (d.value / max) * 100;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm w-32 truncate text-slate-700">{d.label}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-3">
              <div className="h-3 rounded-full transition-all" style={{ width: `${w}%`, background: color }} />
            </div>
            <span className="text-sm font-mono w-12 text-right">{d.value}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function RelatoriosPage() {
  const [inicio, setInicio] = useState(monthAgo());
  const [fim, setFim] = useState(todayISO());
  const [diaDetalhe, setDiaDetalhe] = useState(todayISO());
  const [porOperarioDia, setPorOperarioDia] = useState<ProducaoOperarioDia[]>([]);
  const [porLote, setPorLote] = useState<ProducaoLote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operarios = useLiveQuery(() => db.operarios.toArray(), []) ?? [];
  const lotes = useLiveQuery(() => db.lotes.toArray(), []) ?? [];

  const operarioByServer = useMemo(
    () => new Map(operarios.map((o) => [o.serverId ?? o.id, o])),
    [operarios],
  );
  const operarioByLocal = useMemo(() => new Map(operarios.map((o) => [o.id, o])), [operarios]);
  const loteByServer = useMemo(
    () => new Map(lotes.map((l) => [l.serverId ?? l.id, l])),
    [lotes],
  );
  const loteByLocal = useMemo(() => new Map(lotes.map((l) => [l.id, l])), [lotes]);

  const alocacoesDia = useLiveQuery(
    async () => db.alocacoes.where('data').equals(diaDetalhe).toArray(),
    [diaDetalhe],
  ) ?? [];
  const packsDia = useLiveQuery(
    async () => db.packs.where('data').equals(diaDetalhe).toArray(),
    [diaDetalhe],
  ) ?? [];
  const jornada = useLiveQuery(() => db.jornadaCache.get('singleton'), [])?.data;
  const ausenciasDia = useLiveQuery(
    async () => {
      const all = await db.ausencias.toArray();
      return all.filter(
        (a) => !a.pendingDelete && a.dataInicio <= diaDetalhe && diaDetalhe <= a.dataFim,
      );
    },
    [diaDetalhe],
  ) ?? [];

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void pullAlocacoesForDate(diaDetalhe);
    void pullPacksForDate(diaDetalhe);
  }, [diaDetalhe]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([
        api.get<ProducaoOperarioDia[]>('/relatorios/producao-operario-dia', {
          params: { inicio, fim },
        }),
        api.get<ProducaoLote[]>('/relatorios/producao-lote', { params: { inicio, fim } }),
      ]);
      setPorOperarioDia(a.data);
      setPorLote(b.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const totalPecas = useMemo(
    () => porOperarioDia.reduce((s, r) => s + r.total, 0),
    [porOperarioDia],
  );
  const diasComProducao = useMemo(
    () => new Set(porOperarioDia.filter((r) => r.total > 0).map((r) => r.data)).size,
    [porOperarioDia],
  );
  const operariosAtivos = useMemo(
    () => new Set(porOperarioDia.filter((r) => r.total > 0).map((r) => r.operarioId)).size,
    [porOperarioDia],
  );
  const lotesProduzidos = useMemo(
    () => porLote.filter((r) => r.total > 0).length,
    [porLote],
  );
  const mediaDia = diasComProducao > 0 ? Math.round(totalPecas / diasComProducao) : 0;

  const porDia = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of porOperarioDia) m.set(r.data, (m.get(r.data) ?? 0) + r.total);
    const result: { label: string; value: number; date: string }[] = [];
    const start = new Date(inicio + 'T00:00:00');
    const end = new Date(fim + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return result;
    const cur = new Date(start);
    let safety = 0;
    while (cur <= end && safety < 366) {
      const iso = cur.toISOString().slice(0, 10);
      result.push({ label: fmtDayMonth(iso), value: m.get(iso) ?? 0, date: iso });
      cur.setDate(cur.getDate() + 1);
      safety++;
    }
    return result;
  }, [porOperarioDia, inicio, fim]);

  const topOperarios = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of porOperarioDia) m.set(r.operarioId, (m.get(r.operarioId) ?? 0) + r.total);
    return Array.from(m.entries())
      .map(([id, total]) => ({ label: operarioByServer.get(id)?.nome ?? id.slice(0, 8), value: total }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [porOperarioDia, operarioByServer]);

  const topLotes = useMemo(() => {
    return porLote
      .map((r) => ({
        label: loteByServer.get(r.loteId)?.codigo ?? r.loteId.slice(0, 8),
        value: r.total,
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [porLote, loteByServer]);

  const shiftStartMin = jornada ? toMin(normalizeTime(jornada.horaInicio)) : DEFAULT_SHIFT_START_MIN;
  const shiftEndMin = jornada ? toMin(normalizeTime(jornada.horaFim)) : DEFAULT_SHIFT_END_MIN;
  const pausasMin = useMemo(
    () =>
      (jornada?.pausas ?? []).map((p) => ({
        start: toMin(normalizeTime(p.horaInicio)),
        end: toMin(normalizeTime(p.horaFim)),
      })),
    [jornada],
  );

  const ausentesPorOperario = useMemo(() => {
    const m = new Map<string, (typeof ausenciasDia)[number]>();
    for (const a of ausenciasDia) {
      const op = operarioByServer.get(a.operarioId) ?? operarioByLocal.get(a.operarioId);
      if (op) m.set(op.id, a);
    }
    return m;
  }, [ausenciasDia, operarioByServer, operarioByLocal]);

  const detalheDia = useMemo(() => {
    const allocByOp = new Map<string, typeof alocacoesDia>();
    for (const a of alocacoesDia) {
      if (a.pendingDelete) continue;
      (allocByOp.get(a.operarioId) ?? allocByOp.set(a.operarioId, []).get(a.operarioId)!).push(a);
    }
    const packsByAloc = new Map<string, number>();
    for (const p of packsDia) {
      if (p.pendingDelete) continue;
      packsByAloc.set(p.alocacaoId, (packsByAloc.get(p.alocacaoId) ?? 0) + p.quantidade);
    }

    type Item = {
      alocId: string;
      horario: string;
      loteCodigo: string;
      tamanho: string;
      operacao: string;
      horas: number;
      meta: number;
      produzido: number;
      pct: number;
    };
    type Row = {
      operarioId: string;
      operarioNome: string;
      itens: Item[];
      totalMeta: number;
      totalProduzido: number;
      totalPct: number;
      ausenciaTipo?: string;
    };
    const rows: Row[] = [];

    for (const [opId, alocs] of allocByOp) {
      const ausencia = ausentesPorOperario.get(opId);
      const sorted = [...alocs].sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio));
      const itens: Item[] = sorted.map((a, i) => {
        const rawStart = toMin(a.horarioInicio);
        const rawEnd = i + 1 < sorted.length ? toMin(sorted[i + 1].horarioInicio) : shiftEndMin;
        const startMin = Math.max(rawStart, shiftStartMin);
        const endMin = Math.min(rawEnd, shiftEndMin);
        const span = Math.max(0, endMin - startMin);
        const pausaOverlap = pausasMin.reduce(
          (s, p) => s + overlapMin(startMin, endMin, p.start, p.end),
          0,
        );
        const workingMin = ausencia ? 0 : Math.max(0, span - pausaOverlap);
        const horas = workingMin / 60;
        const lote = loteByLocal.get(a.loteId);
        const operacao = lote?.operacoes.find((o) => o.id === a.operacaoId);
        const meta = Math.round((operacao?.metaPorHora ?? 0) * horas);
        const produzido = packsByAloc.get(a.id) ?? 0;
        const pct = meta > 0 ? Math.round((produzido / meta) * 100) : 0;
        return {
          alocId: a.id,
          horario: a.horarioInicio.slice(0, 5),
          loteCodigo: lote?.codigo ?? '?',
          tamanho: a.tamanho,
          operacao: operacao?.nome ?? '?',
          horas,
          meta,
          produzido,
          pct,
        };
      });
      const totalMeta = itens.reduce((s, x) => s + x.meta, 0);
      const totalProduzido = itens.reduce((s, x) => s + x.produzido, 0);
      const totalPct = totalMeta > 0 ? Math.round((totalProduzido / totalMeta) * 100) : 0;
      const op = operarioByLocal.get(opId);
      rows.push({
        operarioId: opId,
        operarioNome: op?.nome ?? opId,
        itens,
        totalMeta,
        totalProduzido,
        totalPct,
        ausenciaTipo: ausencia?.tipo,
      });
    }
    rows.sort((a, b) => b.totalPct - a.totalPct);
    return rows;
  }, [alocacoesDia, packsDia, loteByLocal, operarioByLocal, shiftStartMin, shiftEndMin, pausasMin, ausentesPorOperario]);

  const semDadosPeriodo = porDia.every((d) => d.value === 0);
  const shiftEndH = Math.floor(shiftEndMin / 60);
  const shiftEndM = shiftEndMin % 60;
  const shiftEndLabel = shiftEndM === 0 ? `${shiftEndH}h` : `${shiftEndH}h${String(shiftEndM).padStart(2, '0')}`;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h2 className="text-2xl font-semibold">Relatórios</h2>

      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-sm text-slate-700 mb-1">De</span>
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md"
          />
        </label>
        <label className="block">
          <span className="block text-sm text-slate-700 mb-1">Até</span>
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md"
          />
        </label>
        <button
          onClick={load}
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-800"
        >
          Atualizar
        </button>
        {loading && <span className="text-sm text-slate-500">Carregando…</span>}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Total de peças"
          value={totalPecas.toLocaleString('pt-BR')}
          sub={`em ${diasComProducao} dia(s) com produção`}
        />
        <Kpi label="Média por dia" value={mediaDia.toLocaleString('pt-BR')} sub="peças/dia" />
        <Kpi label="Operários ativos" value={operariosAtivos} sub="produziram no período" />
        <Kpi label="Lotes produzidos" value={lotesProduzidos} sub="com peças no período" />
      </div>

      <section className="bg-white border border-slate-200 rounded-md p-4">
        <h3 className="font-semibold mb-3">Produção diária</h3>
        {semDadosPeriodo ? (
          <p className="text-sm text-slate-500">Sem dados.</p>
        ) : (
          <VBars data={porDia} />
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200 rounded-md p-4">
          <h3 className="font-semibold mb-3">Top operários</h3>
          <HBars data={topOperarios} color="#0f766e" />
        </section>
        <section className="bg-white border border-slate-200 rounded-md p-4">
          <h3 className="font-semibold mb-3">Top lotes</h3>
          <HBars data={topLotes} color="#1d4ed8" />
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-md p-4 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold">Meta x produzido por operário</h3>
            <p className="text-xs text-slate-500 mt-1">
              Por alocação no dia. Meta = meta/hora × horas trabalhadas (até a próxima alocação ou
              fim de turno {shiftEndLabel}), descontando pausas da jornada e ausências.
            </p>
          </div>
          <label className="block">
            <span className="block text-sm text-slate-700 mb-1">Dia</span>
            <input
              type="date"
              value={diaDetalhe}
              onChange={(e) => setDiaDetalhe(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md"
            />
          </label>
        </div>

        {detalheDia.length === 0 ? (
          <p className="text-sm text-slate-500">Sem alocações neste dia.</p>
        ) : (
          <div className="space-y-3">
            {detalheDia.map((row) => (
              <div key={row.operarioId} className="border border-slate-100 rounded-md p-3">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <h4 className="font-semibold truncate">
                    {row.operarioNome}
                    {row.ausenciaTipo && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-normal">
                        {row.ausenciaTipo}
                      </span>
                    )}
                  </h4>
                  <span className="text-sm whitespace-nowrap">
                    <span className="font-mono">{row.totalProduzido}</span>
                    <span className="text-slate-400"> / </span>
                    <span className="font-mono">{row.totalMeta}</span>{' '}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${pctBadge(row.totalPct)}`}>
                      {row.totalPct}%
                    </span>
                  </span>
                </div>
                <ul className="space-y-2">
                  {row.itens.map((it) => (
                    <li key={it.alocId}>
                      <div className="flex justify-between text-sm mb-1 gap-2">
                        <span className="text-slate-700 min-w-0 truncate">
                          <span className="font-mono">{it.horario}</span>
                          <span className="text-slate-400"> · </span>
                          {it.loteCodigo} · tam {it.tamanho} · {it.operacao}
                          <span className="text-slate-400"> · </span>
                          <span className="text-slate-500">{it.horas.toFixed(1)}h</span>
                        </span>
                        <span className="font-mono whitespace-nowrap">
                          {it.produzido} / {it.meta}{' '}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${pctBadge(it.pct)}`}>
                            {it.pct}%
                          </span>
                        </span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 transition-all ${pctBar(it.pct)}`}
                          style={{ width: `${Math.min(100, it.pct)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
