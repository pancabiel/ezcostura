import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { api } from '../../lib/axios';
import { getDb } from '../../db/dexie';
import {
  pullAlocacoesForDate,
  pullAlocacoesForRange,
  pullPacksForDate,
  pullPacksForRange,
} from '../../services/syncService';
import { resolverJornadaEfetiva } from '../jornada/jornadaRepo';
import type { JornadaEfetiva } from '../../types/jornada';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import { cn, fmtPct } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  if (pct >= 100) return 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300';
  if (pct >= 75) return 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300';
  return 'border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300';
}
function pctBar(pct: number) {
  if (pct >= 100) return 'bg-emerald-500';
  if (pct >= 75) return 'bg-amber-500';
  return 'bg-rose-500';
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * Gráfico de barras horizontais — funciona bem em qualquer largura, especialmente mobile.
 * Cada linha mostra rótulo, valor numérico e barra proporcional.
 */
function HBars({
  data,
  color = '#0f766e',
  unit = '',
  valueFormat,
}: {
  data: { label: string; value: number; sub?: string }[];
  color?: string;
  unit?: string;
  valueFormat?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  return (
    <div className="flex flex-col gap-2">
      {data.map((d, i) => {
        const w = (d.value / max) * 100;
        const safe = Number.isFinite(d.value) ? d.value : 0;
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium truncate text-foreground">{d.label}</span>
              <span className="font-mono text-foreground shrink-0">
                {valueFormat ? valueFormat(safe) : safe}{unit}
              </span>
            </div>
            <div className="bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all"
                style={{ width: `${Math.min(100, w)}%`, background: color }}
              />
            </div>
            {d.sub && <span className="text-[11px] text-muted-foreground">{d.sub}</span>}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Gráfico de linha do tempo — eixo X são datas, valor por barra.
 * Para mobile, mostra apenas 14 dias mais recentes em formato horizontal scrollável,
 * mas com altura adequada e tooltips clicáveis.
 */
function Timeline({ data, color = '#10b981', unit = '' }: { data: { label: string; value: number }[]; color?: string; unit?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  return (
    <div>
      <div className="flex items-end gap-1 h-44 overflow-x-auto pb-1">
        {data.map((d, i) => {
          const h = max > 0 ? (d.value / max) * 100 : 0;
          const isActive = active === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(isActive ? null : i)}
              className="flex flex-col items-center justify-end h-full gap-1 min-w-[24px] sm:min-w-[28px]"
              title={`${d.label}: ${d.value}${unit}`}
            >
              <span className={cn('text-[10px]', isActive ? 'text-foreground font-semibold' : 'text-transparent')}>
                {d.value || ''}
              </span>
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${h}%`,
                  background: isActive ? '#0f766e' : color,
                  minHeight: d.value > 0 ? 2 : 0,
                }}
              />
              <span className={cn('text-[10px] truncate w-full text-center', isActive ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {d.label}
              </span>
            </button>
          );
        })}
      </div>
      {active !== null && data[active] && (
        <p className="text-xs text-foreground mt-2">
          <span className="font-semibold">{data[active].label}:</span>{' '}
          <span className="font-mono">{data[active].value}{unit}</span>
        </p>
      )}
    </div>
  );
}

export default function RelatoriosPage() {
  const [inicio, setInicio] = useState(monthAgo());
  const [fim, setFim] = useState(todayISO());
  const [diaDetalhe, setDiaDetalhe] = useState(todayISO());
  const [operarioFoco, setOperarioFoco] = useState<string>('');
  const [porOperarioDia, setPorOperarioDia] = useState<ProducaoOperarioDia[]>([]);
  const [porLote, setPorLote] = useState<ProducaoLote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operarios = useLiveQuery(() => getDb().operarios.toArray(), []) ?? [];
  const lotes = useLiveQuery(() => getDb().lotes.toArray(), []) ?? [];
  const jornadas = useLiveQuery(() => getDb().jornadas.toArray(), []) ?? [];
  const diasEspeciais = useLiveQuery(() => getDb().diasEspeciais.toArray(), []) ?? [];

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

  // Alocações e packs do período (cacheadas em Dexie após pull em batch).
  const alocacoesPeriodo = useLiveQuery(
    async () => (await getDb().alocacoes.toArray()).filter((a) => !a.pendingDelete && a.data >= inicio && a.data <= fim),
    [inicio, fim],
  ) ?? [];
  const packsPeriodo = useLiveQuery(
    async () => (await getDb().packs.toArray()).filter((p) => !p.pendingDelete && p.data >= inicio && p.data <= fim),
    [inicio, fim],
  ) ?? [];

  const alocacoesDia = useMemo(
    () => alocacoesPeriodo.filter((a) => a.data === diaDetalhe),
    [alocacoesPeriodo, diaDetalhe],
  );
  const packsDia = useMemo(
    () => packsPeriodo.filter((p) => p.data === diaDetalhe),
    [packsPeriodo, diaDetalhe],
  );
  const ausenciasDia = useLiveQuery(
    async () => {
      const all = await getDb().ausencias.toArray();
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
      await Promise.all([
        pullAlocacoesForRange(inicio, fim),
        pullPacksForRange(inicio, fim),
      ]);
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

  // Helper: resolve jornada efetiva por operário num dia.
  const efetivaParaOperario = (operarioId: string, jornadaIdDoOperario: string, data: string): JornadaEfetiva | null =>
    resolverJornadaEfetiva({ operarioId, data, jornadas, diasEspeciais, jornadaIdDoOperario });

  /**
   * Calcula, para cada (operario, dia, alocação), os campos: horas, meta, produzido, pct.
   * É o coração dos novos gráficos por operário/operação e da média total por dia.
   */
  const desempenho = useMemo(() => {
    const ausenciasMap = new Map<string, Set<string>>();
    // ausências indexadas por (operarioId, data)
    // (filtradas dentro do range no consumo)

    type Linha = {
      operarioId: string;
      operarioNome: string;
      data: string;
      alocId: string;
      operacaoId: string;
      operacaoNome: string;
      loteCodigo: string;
      meta: number;
      produzido: number;
      pct: number;
    };
    const linhas: Linha[] = [];

    // Index packs por alocação
    const packsByAloc = new Map<string, number>();
    for (const p of packsPeriodo) {
      packsByAloc.set(p.alocacaoId, (packsByAloc.get(p.alocacaoId) ?? 0) + p.quantidade);
    }

    // Group alocações por operário+data para calcular horas trabalhadas.
    const allocByOpData = new Map<string, typeof alocacoesPeriodo>();
    for (const a of alocacoesPeriodo) {
      const k = `${a.operarioId}|${a.data}`;
      (allocByOpData.get(k) ?? allocByOpData.set(k, []).get(k)!).push(a);
    }

    for (const [k, alocs] of allocByOpData) {
      const [opId, data] = k.split('|');
      const op = operarioByLocal.get(opId);
      if (!op) continue;
      const efetiva = efetivaParaOperario(opId, op.jornadaId, data);
      const shiftStartMin = efetiva ? toMin(efetiva.horaInicio) : DEFAULT_SHIFT_START_MIN;
      const shiftEndMin = efetiva ? toMin(efetiva.horaFim) : DEFAULT_SHIFT_END_MIN;
      const pausasMin = (efetiva?.pausas ?? []).map((p) => ({ start: toMin(p.horaInicio), end: toMin(p.horaFim) }));
      const sorted = [...alocs].sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio));
      sorted.forEach((a, i) => {
        const rawStart = toMin(a.horarioInicio);
        const rawEnd = i + 1 < sorted.length ? toMin(sorted[i + 1].horarioInicio) : shiftEndMin;
        const startMin = Math.max(rawStart, shiftStartMin);
        const endMin = Math.min(rawEnd, shiftEndMin);
        const span = Math.max(0, endMin - startMin);
        const pausaOverlap = pausasMin.reduce((s, p) => s + overlapMin(startMin, endMin, p.start, p.end), 0);
        const ausenteNoDia = ausenciasMap.get(opId)?.has(data) ?? false;
        const workingMin = ausenteNoDia ? 0 : Math.max(0, span - pausaOverlap);
        const horas = workingMin / 60;
        const lote = loteByLocal.get(a.loteId);
        const operacao = lote?.operacoes.find((o) => o.id === a.operacaoId);
        const meta = Math.round((operacao?.metaPorHora ?? 0) * horas);
        const produzido = packsByAloc.get(a.id) ?? 0;
        const pct = meta > 0 ? (produzido / meta) * 100 : 0;
        linhas.push({
          operarioId: opId,
          operarioNome: op.nome,
          data,
          alocId: a.id,
          operacaoId: a.operacaoId,
          operacaoNome: operacao?.nome ?? '?',
          loteCodigo: lote?.codigo ?? '?',
          meta,
          produzido,
          pct,
        });
      });
    }
    return linhas;
  }, [alocacoesPeriodo, packsPeriodo, jornadas, diasEspeciais, operarioByLocal, loteByLocal]);

  // Operário em foco: opções (todos com produção) e dados.
  const operariosComDados = useMemo(() => {
    const ids = new Set(desempenho.map((d) => d.operarioId));
    return operarios
      .filter((o) => ids.has(o.id))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [desempenho, operarios]);

  useEffect(() => {
    if (!operarioFoco && operariosComDados.length > 0) {
      setOperarioFoco(operariosComDados[0].id);
    }
  }, [operariosComDados, operarioFoco]);

  const desempenhoOperario = useMemo(
    () => desempenho.filter((d) => d.operarioId === operarioFoco),
    [desempenho, operarioFoco],
  );

  // Por operação: média de % no período.
  const porOperacao = useMemo(() => {
    const m = new Map<string, { nome: string; pcts: number[]; produzido: number; meta: number }>();
    for (const d of desempenhoOperario) {
      if (d.meta === 0) continue;
      const k = d.operacaoId;
      const cur = m.get(k) ?? { nome: d.operacaoNome, pcts: [], produzido: 0, meta: 0 };
      cur.pcts.push(d.pct);
      cur.produzido += d.produzido;
      cur.meta += d.meta;
      m.set(k, cur);
    }
    return Array.from(m.values())
      .map((v) => ({
        label: v.nome,
        value: v.pcts.reduce((s, x) => s + x, 0) / v.pcts.length,
        sub: `${v.pcts.length} dia(s) · ${v.produzido} / ${v.meta} pçs`,
      }))
      .sort((a, b) => b.value - a.value);
  }, [desempenhoOperario]);

  // Por dia (operário em foco): média % do dia (nova fórmula = média das %).
  const porDiaOperario = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const d of desempenhoOperario) {
      if (d.meta === 0) continue;
      (m.get(d.data) ?? m.set(d.data, []).get(d.data)!).push(d.pct);
    }
    const result: { label: string; value: number; raw: number; date: string }[] = [];
    const start = new Date(inicio + 'T00:00:00');
    const end = new Date(fim + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return result;
    const cur = new Date(start);
    let safety = 0;
    while (cur <= end && safety < 366) {
      const iso = cur.toISOString().slice(0, 10);
      const arr = m.get(iso) ?? [];
      const avgRaw = arr.length > 0 ? arr.reduce((s, x) => s + x, 0) / arr.length : 0;
      result.push({ label: fmtDayMonth(iso), value: Math.round(avgRaw), raw: avgRaw, date: iso });
      cur.setDate(cur.getDate() + 1);
      safety++;
    }
    return result;
  }, [desempenhoOperario, inicio, fim]);

  const mediaPeriodoOperario = useMemo(() => {
    const valores = porDiaOperario.map((x) => x.raw).filter((x) => x > 0);
    if (valores.length === 0) return 0;
    return valores.reduce((s, x) => s + x, 0) / valores.length;
  }, [porDiaOperario]);

  // Detalhe diário (mantido) para o dia em foco.
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
      const op = operarioByLocal.get(opId);
      const efetiva = op ? efetivaParaOperario(opId, op.jornadaId, diaDetalhe) : null;
      const shiftStartMin = efetiva ? toMin(efetiva.horaInicio) : DEFAULT_SHIFT_START_MIN;
      const shiftEndMin = efetiva ? toMin(efetiva.horaFim) : DEFAULT_SHIFT_END_MIN;
      const pausasMin = (efetiva?.pausas ?? []).map((p) => ({ start: toMin(p.horaInicio), end: toMin(p.horaFim) }));
      const sorted = [...alocs].sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio));
      const itens: Item[] = sorted.map((a, i) => {
        const rawStart = toMin(a.horarioInicio);
        const rawEnd = i + 1 < sorted.length ? toMin(sorted[i + 1].horarioInicio) : shiftEndMin;
        const startMin = Math.max(rawStart, shiftStartMin);
        const endMin = Math.min(rawEnd, shiftEndMin);
        const span = Math.max(0, endMin - startMin);
        const pausaOverlap = pausasMin.reduce((s, p) => s + overlapMin(startMin, endMin, p.start, p.end), 0);
        const workingMin = ausencia ? 0 : Math.max(0, span - pausaOverlap);
        const horas = workingMin / 60;
        const lote = loteByLocal.get(a.loteId);
        const operacao = lote?.operacoes.find((o) => o.id === a.operacaoId);
        const meta = Math.round((operacao?.metaPorHora ?? 0) * horas);
        const produzido = packsByAloc.get(a.id) ?? 0;
        const pct = meta > 0 ? (produzido / meta) * 100 : 0;
        return {
          alocId: a.id,
          horario: a.horarioInicio.slice(0, 5),
          loteCodigo: lote?.codigo ?? '?',
          operacao: operacao?.nome ?? '?',
          horas, meta, produzido, pct,
        };
      });
      const totalMeta = itens.reduce((s, x) => s + x.meta, 0);
      const totalProduzido = itens.reduce((s, x) => s + x.produzido, 0);
      const itensComMeta = itens.filter((x) => x.meta > 0);
      const totalPct = itensComMeta.length > 0
        ? itensComMeta.reduce((s, x) => s + x.pct, 0) / itensComMeta.length
        : 0;
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
  }, [alocacoesDia, packsDia, loteByLocal, operarioByLocal, jornadas, diasEspeciais, diaDetalhe, ausentesPorOperario]);

  const semDadosPeriodo = porDia.every((d) => d.value === 0);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">Relatórios</h2>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Field className="w-auto">
            <FieldLabel htmlFor="rel-inicio">De</FieldLabel>
            <Input id="rel-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-auto" />
          </Field>
          <Field className="w-auto">
            <FieldLabel htmlFor="rel-fim">Até</FieldLabel>
            <Input id="rel-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="w-auto" />
          </Field>
          <Button onClick={load}>Atualizar</Button>
          {loading && <span className="text-sm text-muted-foreground">Carregando…</span>}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Kpi label="Total de peças" value={totalPecas.toLocaleString('pt-BR')} sub={`em ${diasComProducao} dia(s)`} />
        <Kpi label="Média por dia" value={mediaDia.toLocaleString('pt-BR')} sub="peças/dia" />
        <Kpi label="Funcionários ativos" value={operariosAtivos} sub="produziram" />
        <Kpi label="Lotes produzidos" value={lotesProduzidos} sub="no período" />
      </div>

      <section className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold mb-3">Produção diária (peças)</h3>
        {semDadosPeriodo ? (
          <p className="text-sm text-muted-foreground">Sem dados.</p>
        ) : (
          <Timeline data={porDia} />
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold mb-3">Top funcionários (peças)</h3>
          <HBars data={topOperarios} color="#0f766e" />
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold mb-3">Top lotes (peças)</h3>
          <HBars data={topLotes} color="#1d4ed8" />
        </section>
      </div>

      <section className="rounded-xl border bg-card p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold">Desempenho por funcionário</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Média do funcionário em cada operação e por dia no período.
            </p>
          </div>
          <Field className="w-auto">
            <FieldLabel htmlFor="rel-operario">Funcionário</FieldLabel>
            <Select value={operarioFoco} onValueChange={setOperarioFoco}>
              <SelectTrigger id="rel-operario" aria-label="Funcionário" className="min-w-[180px]">
                <SelectValue placeholder="— Nenhum com dados —" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {operariosComDados.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        {operarioFoco && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <Kpi
                label="Média no período"
                value={`${fmtPct(mediaPeriodoOperario)}%`}
                sub="média das % diárias"
              />
              <Kpi
                label="Operações"
                value={porOperacao.length}
                sub="com produção"
              />
              <Kpi
                label="Dias com produção"
                value={porDiaOperario.filter((x) => x.value > 0).length}
                sub="no período"
              />
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Média por operação (%)</h4>
              {porOperacao.length === 0
                ? <p className="text-sm text-muted-foreground">Sem dados.</p>
                : <HBars data={porOperacao} color="#0f766e" unit="%" valueFormat={fmtPct} />}
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Média total por dia (%)</h4>
              {porDiaOperario.every((d) => d.value === 0)
                ? <p className="text-sm text-muted-foreground">Sem dados.</p>
                : <Timeline data={porDiaOperario} unit="%" />}
            </div>
          </>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold">Detalhe do dia</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Por alocação. Meta = meta/hora × horas trabalhadas (até a próxima alocação ou
              fim de turno do funcionário), descontando pausas e ausências. Total do funcionário =
              média das % de cada operação.
            </p>
          </div>
          <Field className="w-auto">
            <FieldLabel htmlFor="rel-dia">Dia</FieldLabel>
            <Input id="rel-dia" type="date" value={diaDetalhe} onChange={(e) => setDiaDetalhe(e.target.value)} className="w-auto" />
          </Field>
        </div>

        {detalheDia.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem alocações neste dia.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {detalheDia.map((row) => (
              <div key={row.operarioId} className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <h4 className="font-semibold truncate flex items-center gap-2">
                    {row.operarioNome}
                    {row.ausenciaTipo && (
                      <Badge variant="secondary" className="font-normal">{row.ausenciaTipo}</Badge>
                    )}
                  </h4>
                  <span className="text-sm whitespace-nowrap flex items-center gap-1">
                    <span className="font-mono">{row.totalProduzido}</span>
                    <span className="text-muted-foreground text-xs"> peças</span>
                    <Badge className={cn('ml-1', pctBadge(row.totalPct))}>{fmtPct(row.totalPct)}%</Badge>
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {/* Colunas Meta | Produção | % lado a lado, sem total somado de metas. */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span />
                    <span className="text-right">Meta</span>
                    <span className="text-right">Produção</span>
                    <span className="text-right">%</span>
                  </div>
                  {row.itens.map((it) => (
                    <div key={it.alocId} className="flex flex-col gap-1">
                      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 text-sm">
                        <span className="text-foreground min-w-0 truncate">
                          <span className="font-mono">{it.horario}</span>
                          <span className="text-muted-foreground"> · </span>
                          {it.loteCodigo} · {it.operacao}
                          <span className="text-muted-foreground"> · </span>
                          <span className="text-muted-foreground">{it.horas.toFixed(1)}h</span>
                        </span>
                        <span className="font-mono text-right text-muted-foreground">{it.meta}</span>
                        <span className="font-mono text-right font-semibold text-foreground">{it.produzido}</span>
                        <span className="text-right">
                          <Badge className={cn(pctBadge(it.pct))}>{fmtPct(it.pct)}%</Badge>
                        </span>
                      </div>
                      <div className="bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={cn('h-2 transition-all', pctBar(it.pct))}
                          style={{ width: `${Math.min(100, it.pct)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
