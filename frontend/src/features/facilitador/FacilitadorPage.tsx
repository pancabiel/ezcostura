import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import DateNav from '../../components/DateNav';
import PackModal from '../packs/PackModal';
import AlocacaoModal from '../alocacoes/AlocacaoModal';
import { alocacoesRepo } from '../alocacoes/alocacoesRepo';
import { packsRepo } from '../packs/packsRepo';
import { jornadaRepo, pausaAtiva } from '../jornada/jornadaRepo';
import { pullAlocacoesForDate, pullPacksForDate } from '../../services/syncService';
import type { OperarioLocal } from '../../types/operario';
import type { AlocacaoLocal } from '../../types/alocacao';
import type { PackLocal } from '../../types/pack';
import type { ConfiguracaoJornadaWire } from '../../types/jornada';
import type { AusenciaLocal, TipoAusencia } from '../../types/ausencia';

const todayISO = () => new Date().toISOString().slice(0, 10);

const TIPO_BADGE: Record<TipoAusencia, string> = {
  ATESTADO: 'bg-amber-100 text-amber-800',
  FALTA: 'bg-rose-100 text-rose-800',
  FERIAS: 'bg-sky-100 text-sky-800',
  FOLGA: 'bg-slate-200 text-slate-700',
};

const TIPO_LABEL: Record<TipoAusencia, string> = {
  ATESTADO: 'Atestado',
  FALTA: 'Falta',
  FERIAS: 'Férias',
  FOLGA: 'Folga',
};

export default function FacilitadorPage() {
  const [data, setData] = useState<string>(todayISO());
  const [packTarget, setPackTarget] = useState<{ op: OperarioLocal; alocs: AlocacaoLocal[] } | null>(null);
  const [allocTarget, setAllocTarget] = useState<OperarioLocal | null>(null);
  const [jornada, setJornada] = useState<ConfiguracaoJornadaWire | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    void pullAlocacoesForDate(data);
    void pullPacksForDate(data);
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    void jornadaRepo.getCached().then((c) => { if (!cancelled) setJornada(c); });
    void jornadaRepo.refresh().then((c) => { if (!cancelled) setJornada(c); });
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const operarios = useLiveQuery(
    async () => (await db.operarios.toArray())
      .filter((o) => o.ativo && !o.pendingDelete)
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [],
  ) ?? [];

  const alocacoes = useLiveQuery(
    async () => db.alocacoes.where('data').equals(data).toArray(),
    [data],
  ) ?? [];

  const packs = useLiveQuery(
    async () => db.packs.where('data').equals(data).toArray(),
    [data],
  ) ?? [];

  const lotes = useLiveQuery(() => db.lotes.toArray(), []) ?? [];
  const ausencias = useLiveQuery(
    async () => (await db.ausencias.toArray()).filter((a) => !a.pendingDelete),
    [],
  ) ?? [];
  const loteById = useMemo(() => new Map(lotes.map((l) => [l.id, l])), [lotes]);
  const alocById = useMemo(() => new Map(alocacoes.map((a) => [a.id, a])), [alocacoes]);

  const ausenciaByOperario = useMemo(() => {
    const m = new Map<string, AusenciaLocal>();
    for (const a of ausencias) {
      if (a.dataInicio <= data && a.dataFim >= data) {
        m.set(a.operarioId, a);
      }
    }
    return m;
  }, [ausencias, data]);

  const pausa = jornada ? (data === todayISO() ? pausaAtiva(jornada, now) : null) : null;

  const allocByOperario = useMemo(() => {
    const m = new Map<string, AlocacaoLocal[]>();
    for (const a of alocacoes) {
      if (a.pendingDelete) continue;
      (m.get(a.operarioId) ?? m.set(a.operarioId, []).get(a.operarioId)!).push(a);
    }
    for (const v of m.values()) v.sort((x, y) => x.horarioInicio.localeCompare(y.horarioInicio));
    return m;
  }, [alocacoes]);

  const packsByOperario = useMemo(() => {
    const m = new Map<string, PackLocal[]>();
    for (const p of packs) {
      if (p.pendingDelete) continue;
      (m.get(p.operarioId) ?? m.set(p.operarioId, []).get(p.operarioId)!).push(p);
    }
    for (const v of m.values()) v.sort((x, y) => x.horario.localeCompare(y.horario));
    return m;
  }, [packs]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h2 className="text-2xl font-semibold">Facilitador</h2>
      <DateNav value={data} onChange={setData} showTodayBanner />

      {pausa && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-md text-sm">
          Em pausa: <span className="font-semibold">{pausa.nome}</span> até {pausa.horaFim}
        </div>
      )}

      {operarios.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-slate-500">
          Nenhum operário ativo.
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {operarios.map((op) => {
            const opAlocs = allocByOperario.get(op.id) ?? [];
            const opPacks = packsByOperario.get(op.id) ?? [];
            const total = opPacks.reduce((s, p) => s + p.quantidade, 0);
            const vigente = alocacoesRepo.pickVigente(opAlocs, new Date());
            const ausencia = ausenciaByOperario.get(op.id);
            return (
              <li
                key={op.id}
                className={`bg-white border border-slate-200 rounded-md p-4 flex flex-col gap-3 ${
                  ausencia ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold">{op.nome}</h3>
                    {ausencia && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_BADGE[ausencia.tipo]}`}>
                        {TIPO_LABEL[ausencia.tipo]}
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-emerald-700">{total}</span>
                </div>

                <div className="text-sm text-slate-600 space-y-1">
                  {opAlocs.length === 0 ? (
                    <p className="italic">Sem alocações.</p>
                  ) : (
                    opAlocs.map((a) => {
                      const lote = loteById.get(a.loteId);
                      const operacao = lote?.operacoes.find((o) => o.id === a.operacaoId);
                      const isVigente = vigente?.id === a.id;
                      return (
                        <p
                          key={a.id}
                          className={isVigente ? 'font-semibold text-slate-900' : 'text-slate-500'}
                        >
                          <span className="font-mono">{a.horarioInicio.slice(0, 5)}</span>
                          {' · '}
                          {lote?.codigo ?? '?'} · tam {a.tamanho} · {operacao?.nome ?? '?'}
                          {isVigente && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">vigente</span>}
                        </p>
                      );
                    })
                  )}
                </div>

                {opPacks.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-slate-600">Histórico ({opPacks.length})</summary>
                    <ul className="mt-2 space-y-1">
                      {opPacks.map((p) => {
                        const aloc = alocById.get(p.alocacaoId);
                        const lote = aloc ? loteById.get(aloc.loteId) : undefined;
                        const operacao = aloc ? lote?.operacoes.find((o) => o.id === aloc.operacaoId) : undefined;
                        return (
                          <li key={p.id} className="flex items-center justify-between gap-2 text-slate-600">
                            <span className="flex-1 min-w-0">
                              <span className="font-mono">{new Date(p.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                              {' · '}
                              <span className="font-semibold text-slate-900">{p.quantidade} pçs</span>
                              {' · '}
                              {lote?.codigo ?? '?'} · tam {aloc?.tamanho ?? '?'} · {operacao?.nome ?? '?'}
                            </span>
                            <button
                              onClick={() => confirm('Remover este pack?') && packsRepo.markDeleted(p.id)}
                              className="text-rose-600 text-xs hover:underline shrink-0"
                            >
                              remover
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                )}

                <div className="flex gap-2 mt-auto pt-2">
                  <button
                    onClick={() => setPackTarget({ op, alocs: opAlocs })}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-md font-medium hover:bg-emerald-700"
                  >
                    + Pack
                  </button>
                  <button
                    onClick={() => setAllocTarget(op)}
                    className="px-4 py-3 rounded-md border border-slate-300 bg-white text-sm"
                  >
                    + Alocação
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {packTarget && (
        <PackModal
          operarioId={packTarget.op.id}
          operarioNome={packTarget.op.nome}
          data={data}
          alocacoes={packTarget.alocs}
          lotes={lotes}
          onClose={() => setPackTarget(null)}
        />
      )}
      {allocTarget && (
        <AlocacaoModal
          operarioId={allocTarget.id}
          operarioNome={allocTarget.nome}
          data={data}
          onClose={() => setAllocTarget(null)}
        />
      )}
    </div>
  );
}
