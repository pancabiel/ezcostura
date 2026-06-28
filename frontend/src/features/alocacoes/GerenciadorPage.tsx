import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '../../db/dexie';
import DateNav from '../../components/DateNav';
import AlocacaoModal from './AlocacaoModal';
import { pullAlocacoesForDate } from '../../services/syncService';
import type { AlocacaoLocal } from '../../types/alocacao';
import type { OperarioLocal } from '../../types/operario';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Empty, EmptyTitle } from '@/components/ui/empty';

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
    const all = await getDb().operarios.toArray();
    return all
      .filter((o) => o.ativo && !o.pendingDelete)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, []) ?? [];

  const alocacoes = useLiveQuery(
    async () => getDb().alocacoes.where('data').equals(data).toArray(),
    [data],
  ) ?? [];

  const lotes = useLiveQuery(() => getDb().lotes.toArray(), []) ?? [];
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
    <div className="max-w-6xl mx-auto flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">Gerenciador de Operações</h2>
      <DateNav value={data} onChange={setData} showTodayBanner />

      {operarios.length === 0 ? (
        <Empty className="border">
          <EmptyTitle>Nenhum funcionário ativo. Cadastre funcionários antes de planejar.</EmptyTitle>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {operarios.map((op) => {
            const lista = allocByOperario.get(op.id) ?? [];
            return (
              <li key={op.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{op.nome}</h3>
                      <Button size="sm" onClick={() => setEditing({ operario: op })}>
                        + Adicionar alocação
                      </Button>
                    </div>
                    {lista.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem alocações neste dia.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {lista.map((a) => {
                          const lote = loteById.get(a.loteId);
                          const operacao = lote?.operacoes.find((o) => o.id === a.operacaoId);
                          return (
                            <li
                              key={a.id}
                              onClick={() => setEditing({ operario: op, alocacao: a })}
                              className="flex items-center gap-3 rounded-md border px-3 py-2 hover:bg-muted/50 cursor-pointer"
                            >
                              <span className="font-mono text-sm text-foreground">{a.horarioInicio.slice(0, 5)}</span>
                              <span className="text-sm">
                                {lote ? `${lote.codigo} · ${lote.nome}` : 'Lote ?'}
                                <span className="text-muted-foreground"> · </span>
                                op {operacao?.nome ?? '?'}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
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
