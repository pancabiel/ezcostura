import { useState } from 'react';
import { ausenciasRepo } from './ausenciasRepo';
import type { AusenciaLocal, TipoAusencia } from '../../types/ausencia';
import type { OperarioLocal } from '../../types/operario';

interface Props {
  ausencia?: AusenciaLocal;
  operarios: OperarioLocal[];
  onClose: () => void;
}

const TIPOS: TipoAusencia[] = ['ATESTADO', 'FALTA', 'FERIAS', 'FOLGA'];
const TIPO_LABEL: Record<TipoAusencia, string> = {
  ATESTADO: 'Atestado',
  FALTA: 'Falta',
  FERIAS: 'Férias',
  FOLGA: 'Folga',
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function AusenciaModal({ ausencia, operarios, onClose }: Props) {
  const isEdit = Boolean(ausencia);
  const [operarioId, setOperarioId] = useState(ausencia?.operarioId ?? operarios[0]?.id ?? '');
  const [dataInicio, setDataInicio] = useState(ausencia?.dataInicio ?? todayISO());
  const [dataFim, setDataFim] = useState(ausencia?.dataFim ?? todayISO());
  const [tipo, setTipo] = useState<TipoAusencia>(ausencia?.tipo ?? 'ATESTADO');
  const [observacao, setObservacao] = useState(ausencia?.observacao ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!operarioId) { setError('Selecione um funcionário.'); return; }
    if (dataFim < dataInicio) { setError('Data fim deve ser maior ou igual à data início.'); return; }
    setSaving(true);
    try {
      const payload = {
        operarioId,
        dataInicio,
        dataFim,
        tipo,
        observacao: observacao.trim() || undefined,
      };
      if (isEdit && ausencia) {
        await ausenciasRepo.update(ausencia.id, payload);
      } else {
        await ausenciasRepo.create(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <h3 className="text-xl font-semibold">{isEdit ? 'Editar ausência' : 'Nova ausência'}</h3>

        {error && <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-md text-sm">{error}</div>}

        <Field label="Funcionário">
          <select autoFocus value={operarioId} onChange={(e) => setOperarioId(e.target.value)} className="input">
            <option value="">Selecione…</option>
            {operarios.map((o) => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data início">
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input" />
          </Field>
          <Field label="Data fim">
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="input" />
          </Field>
        </div>

        <Field label="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoAusencia)} className="input">
            {TIPOS.map((t) => (
              <option key={t} value={t}>{TIPO_LABEL[t]}</option>
            ))}
          </select>
        </Field>

        <Field label="Observação">
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            className="input"
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-slate-300 bg-white">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-slate-900 text-white disabled:opacity-50">
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>

        <style>{`.input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid rgb(203 213 225); border-radius: 0.375rem; background: white; }`}</style>
      </form>
    </div>
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
