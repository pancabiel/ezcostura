import { useEffect, useMemo, useState } from 'react';
import { packsRepo } from './packsRepo';
import { alocacoesRepo } from '../alocacoes/alocacoesRepo';
import { getSession } from '../../stores/authStore';
import { db } from '../../db/dexie';
import type { AlocacaoLocal } from '../../types/alocacao';
import type { LoteLocal } from '../../types/lote';

interface Props {
  operarioId: string;
  operarioNome: string;
  data: string;
  alocacoes: AlocacaoLocal[];
  lotes: LoteLocal[];
  onClose: () => void;
}

export default function PackModal({ operarioId, operarioNome, data, alocacoes, lotes, onClose }: Props) {
  const vigente = useMemo(() => alocacoesRepo.pickVigente(alocacoes, new Date()), [alocacoes]);
  const [alocacaoId, setAlocacaoId] = useState<string>(vigente?.id ?? alocacoes[0]?.id ?? '');
  const [quantidade, setQuantidade] = useState<number>(0);
  const [quantidadeTouched, setQuantidadeTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const session = getSession();

  const selectedLoteId = useMemo(
    () => alocacoes.find((a) => a.id === alocacaoId)?.loteId,
    [alocacaoId, alocacoes],
  );

  useEffect(() => {
    if (!selectedLoteId || quantidadeTouched) return;
    let cancelled = false;
    void (async () => {
      const allAlocs = await db.alocacoes.toArray();
      const alocIdsForLote = new Set(
        allAlocs.filter((a) => a.loteId === selectedLoteId).map((a) => a.id),
      );
      if (alocIdsForLote.size === 0) return;
      const allPacks = await db.packs.toArray();
      const matches = allPacks.filter(
        (p) => !p.pendingDelete && alocIdsForLote.has(p.alocacaoId),
      );
      if (cancelled || matches.length === 0) {
        if (!cancelled) setQuantidade(0);
        return;
      }
      matches.sort((a, b) => b.horario.localeCompare(a.horario));
      setQuantidade(matches[0].quantidade);
    })();
    return () => { cancelled = true; };
  }, [selectedLoteId, quantidadeTouched]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alocacaoId) {
      setError('Selecione uma alocação.');
      return;
    }
    if (!quantidade || quantidade <= 0) {
      setError('Quantidade deve ser maior que zero.');
      return;
    }
    setSaving(true);
    try {
      await packsRepo.create({
        operarioId, data,
        horario: new Date().toISOString(),
        alocacaoId,
        quantidade,
        registradoPor: session?.userId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  const loteFor = (a: AlocacaoLocal) => lotes.find((l) => l.id === a.loteId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold">Adicionar pack</h3>
            <p className="text-sm text-slate-500">{operarioNome}</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {alocacoes.length === 0 ? (
            <p className="text-sm text-rose-700">Operário sem alocação neste dia. Cadastre uma antes.</p>
          ) : (
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Alocação</span>
              <select
                value={alocacaoId}
                onChange={(e) => setAlocacaoId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                {alocacoes.map((a) => {
                  const lote = loteFor(a);
                  const op = lote?.operacoes.find((o) => o.id === a.operacaoId);
                  const isVigente = vigente?.id === a.id;
                  return (
                    <option key={a.id} value={a.id}>
                      {a.horarioInicio} · {lote?.codigo ?? '?'} · tam {a.tamanho} · {op?.nome ?? '?'}
                      {isVigente ? ' (vigente)' : ''}
                    </option>
                  );
                })}
              </select>
            </label>
          )}

          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Quantidade de peças</span>
            <input
              type="number"
              autoFocus
              min={1}
              inputMode="numeric"
              value={quantidade || ''}
              onChange={(e) => {
                setQuantidade(Number(e.target.value) || 0);
                setQuantidadeTouched(true);
              }}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full text-3xl text-center px-3 py-4 border border-slate-300 rounded-md bg-white font-mono"
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-3 rounded-md border border-slate-300 bg-white">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || alocacoes.length === 0}
              className="px-6 py-3 rounded-md bg-emerald-600 text-white text-lg font-medium disabled:opacity-50 hover:bg-emerald-700"
            >
              {saving ? 'Registrando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
