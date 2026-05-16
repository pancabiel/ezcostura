import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '../../db/dexie';
import { alocacoesRepo } from './alocacoesRepo';
import { resolverJornadaEfetiva } from '../jornada/jornadaRepo';
import type { AlocacaoLocal } from '../../types/alocacao';
import type { LoteLocal } from '../../types/lote';

interface Props {
  operarioId: string;
  operarioNome: string;
  data: string;
  alocacao?: AlocacaoLocal;
  defaultHorario?: string;
  onClose: () => void;
}

export default function AlocacaoModal({
  operarioId, operarioNome, data, alocacao, defaultHorario, onClose,
}: Props) {
  const lotes = useLiveQuery(() => getDb().lotes.toArray(), []) ?? [];
  const jornadas = useLiveQuery(() => getDb().jornadas.toArray(), []) ?? [];
  const diasEspeciais = useLiveQuery(() => getDb().diasEspeciais.toArray(), []) ?? [];
  const operario = useLiveQuery(() => getDb().operarios.get(operarioId), [operarioId]);

  const efetiva = useMemo(() => {
    if (!operario) return null;
    return resolverJornadaEfetiva({
      operarioId,
      data,
      jornadas,
      diasEspeciais,
      jornadaIdDoOperario: operario.jornadaId,
    });
  }, [operario, operarioId, data, jornadas, diasEspeciais]);

  const horarioManha = efetiva?.horaInicio ?? null;
  const horarioTarde = useMemo(() => {
    const almoco = efetiva?.pausas.find((p) => p.tipo === 'ALMOCO');
    return almoco ? almoco.horaFim : null;
  }, [efetiva]);

  const [loteId, setLoteId] = useState<string>(alocacao?.loteId ?? '');
  const [operacaoId, setOperacaoId] = useState<string>(alocacao?.operacaoId ?? '');
  const [horarioInicio, setHorarioInicio] = useState<string>(
    alocacao?.horarioInicio ?? defaultHorario ?? defaultNowHHMM(),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lote: LoteLocal | undefined = useMemo(
    () => lotes.find((l) => l.id === loteId),
    [lotes, loteId],
  );

  useEffect(() => {
    if (!lote) return;
    if (operacaoId && !lote.operacoes.some((o) => o.id === operacaoId)) setOperacaoId('');
  }, [lote, operacaoId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loteId || !operacaoId || !horarioInicio) {
      setError('Preencha todos os campos.');
      return;
    }
    setSaving(true);
    try {
      if (alocacao) {
        await alocacoesRepo.update(alocacao.id, {
          loteId, operacaoId, horarioInicio,
        });
      } else {
        await alocacoesRepo.create({
          operarioId, data, horarioInicio, loteId, operacaoId,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!alocacao) return;
    if (!confirm('Remover esta alocação?')) return;
    await alocacoesRepo.markDeleted(alocacao.id);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold">{alocacao ? 'Editar alocação' : 'Nova alocação'}</h3>
          <p className="text-sm text-slate-500">{operarioNome} · {formatDate(data)}</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-md text-sm">{error}</div>
        )}

        <Field label="Horário de início">
          <div className="space-y-2">
            <input
              type="time"
              value={horarioInicio}
              onChange={(e) => setHorarioInicio(e.target.value)}
              className="input"
              required
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => horarioManha && setHorarioInicio(horarioManha)}
                disabled={!horarioManha}
                className="flex-1 px-3 py-2 rounded-md border border-slate-300 bg-white text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Manhã{horarioManha ? ` (${horarioManha})` : ''}
              </button>
              <button
                type="button"
                onClick={() => horarioTarde && setHorarioInicio(horarioTarde)}
                disabled={!horarioTarde}
                title={horarioTarde ? undefined : 'Configure uma pausa do tipo Almoço na Jornada'}
                className="flex-1 px-3 py-2 rounded-md border border-slate-300 bg-white text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Tarde{horarioTarde ? ` (${horarioTarde})` : ''}
              </button>
            </div>
          </div>
        </Field>

        <Field label="Lote">
          <select value={loteId} onChange={(e) => setLoteId(e.target.value)} className="input" required>
            <option value="">Selecione…</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo} — {l.nome}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Operação">
          <select
            value={operacaoId}
            onChange={(e) => setOperacaoId(e.target.value)}
            className="input"
            disabled={!lote}
            required
          >
            <option value="">Selecione…</option>
            {lote?.operacoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome} (meta {o.metaPorHora}/h)
              </option>
            ))}
          </select>
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          {alocacao && (
            <button type="button" onClick={remove} className="px-3 py-2 text-rose-700 hover:underline mr-auto">
              Remover
            </button>
          )}
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-slate-300 bg-white">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-slate-900 text-white disabled:opacity-50">
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
      <style>{`.input { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid rgb(203 213 225); border-radius: 0.375rem; background: white; }`}</style>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function defaultNowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
}
