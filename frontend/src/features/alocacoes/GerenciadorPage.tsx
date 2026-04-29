import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import DateNav from '../../components/DateNav';
import AlocacaoModal from './AlocacaoModal';
import { pullAlocacoesForDate } from '../../services/syncService';
import type { AlocacaoLocal } from '../../types/alocacao';
import type { OperarioLocal } from '../../types/operario';

const todayISO = () => new Date().toISOString().slice(0, 10);

interface EditingState {
  operario: OperarioLocal;
  alocacao?: AlocacaoLocal;
}

export default function GerenciadorPage() {
  const [data, setData] = useState<string>(todayISO());
  const [editing, setEditing] = useState<EditingState | null>(null);

  useEffect(() => {
    void pullAlocacoesForDate(data);
  }, [data]);

  const operarios = useLiveQuery(async () => {
    const all = await db.operarios.toArray();
    return all
      .filter((o) => o.ativo && !o.pendingDelete)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, []) ?? [];

  const alocacoes = useLiveQuery(
    async () => db.alocacoes.where('data').equals(data).toArray(),
    [data],
  ) ?? [];

  const lotes = useLiveQuery(() => db.lotes.toArray(), []) ?? [];
  const loteById = useMemo(() => new Map(lotes.map((l) => [l.id, l])), [lotes]);

  const allocByOperario = useMemo(() => {
    const map = new Map<string, AlocacaoLocal[]>();
    for (const a of alocacoes) {
      if (a.pendingDelete) continue;
      const arr = map.get(a.operarioId) ?? [];
      arr.push(a);
      map.set(a.operarioId, arr);
    }
    for (const arr of map.values()) arr.sort((x, y) => x.horarioInicio.localeCompare(y.horarioInicio));
    return map;
  }, [alocacoes]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h2 className="text-2xl font-semibold">Gerenciador de Operações</h2>
      <DateNav value={data} onChange={setData} showTodayBanner />

      {operarios.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-slate-500">
          Nenhum operário ativo. Cadastre operários antes de planejar.
        </div>
      ) : (
        <ul className="space-y-3">
          {operarios.map((op) => {
            const lista = allocByOperario.get(op.id) ?? [];
            return (
              <li key={op.id} className="bg-white border border-slate-200 rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{op.nome}</h3>
                  <button
                    onClick={() => setEditing({ operario: op })}
                    className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800"
                  >
                    + Adicionar alocação
                  </button>
                </div>
                {lista.length === 0 ? (
                  <p className="text-sm text-slate-500">Sem alocações neste dia.</p>
                ) : (
                  <ul className="space-y-2">
                    {lista.map((a) => {
                      const lote = loteById.get(a.loteId);
                      const operacao = lote?.operacoes.find((o) => o.id === a.operacaoId);
                      return (
                        <li
                          key={a.id}
                          onClick={() => setEditing({ operario: op, alocacao: a })}
                          className="flex items-center gap-3 border border-slate-100 rounded-md px-3 py-2 hover:bg-slate-50 cursor-pointer"
                        >
                          <span className="font-mono text-sm text-slate-700">{a.horarioInicio.slice(0, 5)}</span>
                          <span className="text-sm">
                            {lote ? `${lote.codigo} · ${lote.nome}` : 'Lote ?'}
                            <span className="text-slate-400"> · </span>
                            tam {a.tamanho}
                            <span className="text-slate-400"> · </span>
                            op {operacao?.nome ?? '?'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <AlocacaoModal
          operarioId={editing.operario.id}
          operarioNome={editing.operario.nome}
          data={data}
          alocacao={editing.alocacao}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
