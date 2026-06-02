import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { getDb } from '../../db/dexie';
import { diasEspeciaisRepo, normalizeTime } from './jornadaRepo';
import { useConfirm } from '../../components/ConfirmDialog';
import type { DiaEspecialLocal, DiaEspecialPausaWire, TipoPausa } from '../../types/jornada';

interface PausaForm extends DiaEspecialPausaWire {
  _key: string;
}

const TIPO_OPTIONS: { value: TipoPausa; label: string }[] = [
  { value: 'ALMOCO', label: 'Almoço' },
  { value: 'CAFE', label: 'Café' },
  { value: 'OUTRO', label: 'Outro' },
];

const FIXED_NOME: Record<Exclude<TipoPausa, 'OUTRO'>, string> = {
  ALMOCO: 'Almoço',
  CAFE: 'Café',
};

export default function DiasEspeciaisPage() {
  const dias = useLiveQuery(
    async () => (await getDb().diasEspeciais.toArray()).filter((d) => !d.pendingDelete).sort((a, b) => b.data.localeCompare(a.data)),
    [],
  ) ?? [];
  const operarios = useLiveQuery(
    async () => (await getDb().operarios.toArray()).filter((o) => !o.pendingDelete && o.ativo).sort((a, b) => a.nome.localeCompare(b.nome)),
    [],
  ) ?? [];

  const [editing, setEditing] = useState<DiaEspecialLocal | 'new' | null>(null);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Dias especiais</h2>
        <button onClick={() => setEditing('new')} className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-800">
          + Novo dia especial
        </button>
      </div>

      <p className="text-sm text-slate-500">
        Sobrescreve o horário de trabalho para uma data específica e para os funcionários selecionados (ex.: véspera de feriado).
      </p>

      {dias.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-slate-500">
          Nenhum dia especial cadastrado.
        </div>
      ) : (
        <ul className="space-y-2">
          {dias.map((d) => {
            const opNomes = d.operarioIds
              .map((id) => operarios.find((o) => o.id === id)?.nome)
              .filter(Boolean);
            return (
              <li
                key={d.id}
                onClick={() => setEditing(d)}
                className="bg-white border border-slate-200 rounded-md p-4 cursor-pointer hover:border-slate-400"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {formatDateBR(d.data)}
                    {d.descricao ? <span className="text-slate-500 font-normal"> · {d.descricao}</span> : null}
                  </span>
                  <span className="font-mono text-sm text-slate-600">
                    {normalizeTime(d.horaInicio)} – {normalizeTime(d.horaFim)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate">
                  {opNomes.length === 0 ? 'Nenhum funcionário' : opNomes.join(', ')}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <DiaEspecialModal
          dia={editing === 'new' ? null : editing}
          operarios={operarios.map((o) => ({ id: o.id, nome: o.nome }))}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function DiaEspecialModal({
  dia,
  operarios,
  onClose,
}: {
  dia: DiaEspecialLocal | null;
  operarios: { id: string; nome: string }[];
  onClose: () => void;
}) {
  const [data, setData] = useState(dia?.data ?? new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState(dia?.descricao ?? '');
  const [horaInicio, setHoraInicio] = useState(dia ? normalizeTime(dia.horaInicio) : '07:00');
  const [horaFim, setHoraFim] = useState(dia ? normalizeTime(dia.horaFim) : '13:00');
  const [pausas, setPausas] = useState<PausaForm[]>(
    dia
      ? dia.pausas.map((p) => ({
          _key: uuid(),
          id: p.id,
          nome: p.nome,
          horaInicio: normalizeTime(p.horaInicio),
          horaFim: normalizeTime(p.horaFim),
          tipo: p.tipo,
        }))
      : [],
  );
  const [opIds, setOpIds] = useState<Set<string>>(new Set(dia?.operarioIds ?? []));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    setError(null);
  }, [data, horaInicio, horaFim, pausas, opIds]);

  const updatePausa = (key: string, patch: Partial<DiaEspecialPausaWire>) => {
    setPausas((arr) =>
      arr.map((x) => {
        if (x._key !== key) return x;
        const merged = { ...x, ...patch };
        if (patch.tipo && patch.tipo !== 'OUTRO') merged.nome = FIXED_NOME[patch.tipo];
        else if (patch.tipo === 'OUTRO' && (x.tipo !== 'OUTRO' || !x.nome.trim())) merged.nome = '';
        return merged;
      }),
    );
  };
  const addPausa = () => {
    setPausas((p) => [
      ...p,
      { _key: uuid(), nome: 'Café', horaInicio: '09:30', horaFim: '09:45', tipo: 'CAFE' },
    ]);
  };
  const removePausa = (key: string) => setPausas((p) => p.filter((x) => x._key !== key));

  const toggleOp = (id: string) => {
    setOpIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (horaFim <= horaInicio) { setError('Hora fim deve ser maior que hora início.'); return; }
    if (opIds.size === 0) { setError('Selecione pelo menos um funcionário.'); return; }
    for (const p of pausas) {
      if (p.tipo === 'OUTRO' && !p.nome.trim()) { setError('Pausa do tipo Outro requer descrição.'); return; }
      if (p.horaFim <= p.horaInicio) { setError('Pausa com horário inválido.'); return; }
      if (p.horaInicio < horaInicio || p.horaFim > horaFim) { setError(`Pausa "${p.nome || p.tipo}" fora do horário do dia.`); return; }
    }

    setSaving(true);
    try {
      const payload: Omit<DiaEspecialLocal, 'id' | 'syncStatus' | 'updatedAt'> = {
        data,
        descricao: descricao.trim() || undefined,
        horaInicio,
        horaFim,
        pausas: pausas.map(({ _key: _ignore, ...rest }) => rest),
        operarioIds: Array.from(opIds),
      };
      if (dia) await diasEspeciaisRepo.update(dia.id, payload);
      else await diasEspeciaisRepo.create(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!dia) return;
    const ok = await confirm({
      title: 'Remover dia especial',
      message: 'Remover este dia especial?',
      confirmLabel: 'Remover',
      variant: 'danger',
    });
    if (!ok) return;
    await diasEspeciaisRepo.markDeleted(dia.id);
    onClose();
  };

  const ativosCount = useMemo(() => operarios.length, [operarios]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit} className="space-y-4">
          <h3 className="text-xl font-semibold">{dia ? 'Editar dia especial' : 'Novo dia especial'}</h3>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-md text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <input autoFocus type="date" value={data} onChange={(e) => setData(e.target.value)} className="input" required />
            </Field>
            <Field label="Descrição">
              <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="input" placeholder="Ex.: Véspera de feriado" />
            </Field>
            <Field label="Início">
              <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="input" required />
            </Field>
            <Field label="Fim">
              <input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} className="input" required />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Pausas</span>
              <button type="button" onClick={addPausa} className="text-sm text-slate-700 hover:underline">
                + Adicionar pausa
              </button>
            </div>
            {pausas.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sem pausas.</p>
            ) : (
              <ul className="space-y-2">
                {pausas.map((p) => (
                  <li key={p._key} className="flex flex-wrap gap-2 items-center">
                    <select value={p.tipo} onChange={(e) => updatePausa(p._key, { tipo: e.target.value as TipoPausa })} className="input">
                      {TIPO_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {p.tipo === 'OUTRO' && (
                      <input value={p.nome} onChange={(e) => updatePausa(p._key, { nome: e.target.value })} placeholder="Descrição" className="input flex-1 min-w-[120px]" />
                    )}
                    <input type="time" value={p.horaInicio} onChange={(e) => updatePausa(p._key, { horaInicio: e.target.value })} className="input" />
                    <input type="time" value={p.horaFim} onChange={(e) => updatePausa(p._key, { horaFim: e.target.value })} className="input" />
                    <button type="button" onClick={() => removePausa(p._key)} className="text-rose-600 text-sm px-2 hover:underline">
                      remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Funcionários ({opIds.size}/{ativosCount})</span>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => setOpIds(new Set(operarios.map((o) => o.id)))} className="text-slate-700 hover:underline">
                  marcar todos
                </button>
                <button type="button" onClick={() => setOpIds(new Set())} className="text-slate-700 hover:underline">
                  limpar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto border border-slate-200 rounded-md p-2">
              {operarios.length === 0 ? (
                <p className="text-xs text-slate-500 italic col-span-2">Nenhum funcionário ativo.</p>
              ) : operarios.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={opIds.has(o.id)} onChange={() => toggleOp(o.id)} className="h-4 w-4" />
                  <span className="truncate">{o.nome}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {dia && (
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

          <style>{`.input { padding: 0.5rem 0.75rem; border: 1px solid rgb(203 213 225); border-radius: 0.375rem; background: white; }`}</style>
        </form>
      </div>
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

function formatDateBR(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}
