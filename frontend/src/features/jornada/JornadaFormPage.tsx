import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import axios from 'axios';
import { getDb } from '../../db/dexie';
import { jornadaApi } from './jornadaApi';
import { jornadasRepo, normalizeTime, jornadaWorkingMinutes } from './jornadaRepo';
import { useConfirm } from '../../components/ConfirmDialog';
import type {
  DiaSemana,
  DiaSemanaOverrideWire,
  JornadaLocal,
  PausaWire,
  TipoPausa,
} from '../../types/jornada';

interface PausaForm extends PausaWire {
  _key: string;
}

interface OverrideForm extends DiaSemanaOverrideWire {
  _key: string;
}

const TIPO_OPTIONS: { value: TipoPausa; label: string }[] = [
  { value: 'ALMOCO', label: 'Almoço' },
  { value: 'CAFE', label: 'Café' },
  { value: 'OUTRO', label: 'Outro' },
];

const DIAS_SEMANA: { value: DiaSemana; label: string; short: string }[] = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

const FIXED_NOME: Record<Exclude<TipoPausa, 'OUTRO'>, string> = {
  ALMOCO: 'Almoço',
  CAFE: 'Café',
};

export default function JornadaFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [nome, setNome] = useState('');
  const [horaInicio, setHoraInicio] = useState('07:00');
  const [horaFim, setHoraFim] = useState('17:00');
  const [pausas, setPausas] = useState<PausaForm[]>([]);
  const [overrides, setOverrides] = useState<OverrideForm[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const j = await jornadasRepo.get(id);
      if (cancelled) return;
      if (!j) {
        setError('Jornada não encontrada.');
        setLoading(false);
        return;
      }
      setNome(j.nome);
      setHoraInicio(normalizeTime(j.horaInicio));
      setHoraFim(normalizeTime(j.horaFim));
      setPausas(
        j.pausas.map((p) => ({
          _key: uuid(),
          id: p.id,
          nome: p.nome,
          horaInicio: normalizeTime(p.horaInicio),
          horaFim: normalizeTime(p.horaFim),
          tipo: p.tipo,
          diaSemana: p.diaSemana ?? null,
        })),
      );
      setOverrides(
        j.diasSemana.map((d) => ({
          _key: uuid(),
          id: d.id,
          diaSemana: d.diaSemana,
          horaInicio: normalizeTime(d.horaInicio),
          horaFim: normalizeTime(d.horaFim),
        })),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const padraoMin = useMemo(() => {
    return jornadaWorkingMinutes({
      horaInicio,
      horaFim,
      pausas: pausas.filter((p) => p.diaSemana === null),
    });
  }, [horaInicio, horaFim, pausas]);

  const updatePausa = (key: string, patch: Partial<PausaWire>) => {
    setPausas((p) =>
      p.map((x) => {
        if (x._key !== key) return x;
        const merged = { ...x, ...patch };
        if (patch.tipo && patch.tipo !== 'OUTRO') merged.nome = FIXED_NOME[patch.tipo];
        else if (patch.tipo === 'OUTRO' && (x.tipo !== 'OUTRO' || !x.nome.trim())) merged.nome = '';
        return merged;
      }),
    );
  };

  const addPausa = (diaSemana: DiaSemana | null) => {
    setPausas((p) => [
      ...p,
      { _key: uuid(), nome: 'Café', horaInicio: '09:30', horaFim: '09:45', tipo: 'CAFE', diaSemana },
    ]);
  };

  const removePausa = (key: string) =>
    setPausas((p) => p.filter((x) => x._key !== key));

  const addOverride = (dia: DiaSemana) => {
    setOverrides((o) => [
      ...o,
      { _key: uuid(), diaSemana: dia, horaInicio, horaFim },
    ]);
  };

  const updateOverride = (key: string, patch: Partial<DiaSemanaOverrideWire>) => {
    setOverrides((o) => o.map((x) => (x._key === key ? { ...x, ...patch } : x)));
  };

  const removeOverride = (key: string) => {
    setOverrides((o) => o.filter((x) => x._key !== key));
    // Drop any pausas tied to this day-of-week (use removed override's dia).
    const removed = overrides.find((x) => x._key === key);
    if (removed) {
      setPausas((p) => p.filter((x) => x.diaSemana !== removed.diaSemana));
    }
  };

  const overridesByDia = useMemo(() => {
    const m = new Map<DiaSemana, OverrideForm>();
    for (const o of overrides) m.set(o.diaSemana, o);
    return m;
  }, [overrides]);

  const validate = (): string | null => {
    if (!nome.trim()) return 'Nome é obrigatório.';
    if (horaFim <= horaInicio) return 'Hora fim deve ser maior que hora início.';

    // Validate per-bucket pausas (null = padrão; 0..6 = override).
    const buckets = new Map<DiaSemana | null, PausaForm[]>();
    for (const p of pausas) {
      const k = p.diaSemana ?? null;
      const arr = buckets.get(k) ?? [];
      arr.push(p);
      buckets.set(k, arr);
    }
    for (const [bucketKey, ps] of buckets) {
      let ini = horaInicio;
      let fim = horaFim;
      if (bucketKey !== null) {
        const ov = overridesByDia.get(bucketKey);
        if (!ov) return `Há pausa para ${DIAS_SEMANA[bucketKey].label} mas não há horário especial cadastrado.`;
        ini = ov.horaInicio;
        fim = ov.horaFim;
      }
      const almocos = ps.filter((p) => p.tipo === 'ALMOCO').length;
      if (almocos > 1) return 'Apenas uma pausa de Almoço por dia é permitida.';
      for (const p of ps) {
        if (p.tipo === 'OUTRO' && !p.nome.trim()) return 'Pausa do tipo Outro requer descrição.';
        if (p.horaFim <= p.horaInicio) return `Pausa "${p.nome || p.tipo}" tem horário inválido.`;
        if (p.horaInicio < ini || p.horaFim > fim) {
          return `Pausa "${p.nome || p.tipo}" está fora da jornada.`;
        }
      }
      const sorted = [...ps].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].horaInicio < sorted[i - 1].horaFim) {
          return `Pausas "${sorted[i - 1].nome}" e "${sorted[i].nome}" se sobrepõem.`;
        }
      }
    }

    // Overrides: at most one per day, valid range.
    const seen = new Set<DiaSemana>();
    for (const o of overrides) {
      if (seen.has(o.diaSemana)) return 'Há mais de um horário especial para o mesmo dia da semana.';
      seen.add(o.diaSemana);
      if (o.horaFim <= o.horaInicio) return `Horário especial de ${DIAS_SEMANA[o.diaSemana].label} é inválido.`;
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const msg = validate();
    if (msg) { setError(msg); return; }
    setSaving(true);
    try {
      const payload: Omit<JornadaLocal, 'id' | 'syncStatus' | 'updatedAt'> = {
        nome: nome.trim(),
        horaInicio,
        horaFim,
        pausas: pausas.map(({ _key: _ignore, ...rest }) => rest),
        diasSemana: overrides.map(({ _key: _ignore, ...rest }) => rest),
      };
      if (isEdit && id) await jornadasRepo.update(id, payload);
      else await jornadasRepo.create(payload);
      navigate('/configuracoes/jornada');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const [removing, setRemoving] = useState(false);

  const remove = async () => {
    if (!id) return;
    const ok = await confirm({
      title: 'Remover jornada',
      message: 'Remover esta jornada?',
      confirmLabel: 'Remover',
      variant: 'danger',
    });
    if (!ok) return;
    setError(null);
    setRemoving(true);
    try {
      const local = await getDb().jornadas.get(id);
      if (local?.serverId) {
        await jornadaApi.remove(local.serverId);
      }
      await getDb().jornadas.delete(id);
      navigate('/configuracoes/jornada');
    } catch (err) {
      let msg = err instanceof Error ? err.message : String(err);
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; operarios?: string[] } | undefined;
        if (data?.message) msg = data.message;
      }
      setError(msg);
    } finally {
      setRemoving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Carregando…</p>;

  const horas = Math.floor(padraoMin / 60);
  const minutos = padraoMin % 60;
  const pausasPadrao = pausas.filter((p) => p.diaSemana === null);

  return (
    <form onSubmit={submit} className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{isEdit ? 'Editar jornada' : 'Nova jornada'}</h2>
        <button
          type="button"
          onClick={() => navigate('/configuracoes/jornada')}
          className="text-sm text-slate-600 hover:underline"
        >
          Voltar
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-md text-sm">{error}</div>
      )}

      <section className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
        <Field label="Nome">
          <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} className="input" placeholder="Ex.: Padrão, Meio período…" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Início">
            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="input" />
          </Field>
          <Field label="Fim">
            <input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} className="input" />
          </Field>
        </div>
        <p className="text-sm text-slate-600">
          Tempo trabalhado padrão: <span className="font-semibold">{horas}h {minutos}min</span>
        </p>
      </section>

      <section className="bg-white border border-slate-200 rounded-md p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Pausas (padrão)</h3>
          <button type="button" onClick={() => addPausa(null)} className="text-sm text-slate-700 hover:underline">
            + Adicionar pausa
          </button>
        </div>
        {pausasPadrao.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Sem pausas definidas.</p>
        ) : (
          <PausaList pausas={pausasPadrao} onUpdate={updatePausa} onRemove={removePausa} />
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-md p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Horários especiais por dia da semana</h3>
        </div>
        <p className="text-sm text-slate-500">
          Sobrescreve o horário padrão em dias específicos (ex.: sexta-feira mais curta).
        </p>
        <div className="grid grid-cols-7 gap-2">
          {DIAS_SEMANA.map((d) => {
            const ov = overridesByDia.get(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => (ov ? null : addOverride(d.value))}
                disabled={Boolean(ov)}
                className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${
                  ov ? 'bg-emerald-50 border-emerald-300 text-emerald-700 cursor-default' : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                {d.short}
              </button>
            );
          })}
        </div>
        {overrides.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Sem horários especiais.</p>
        ) : (
          <ul className="space-y-3">
            {overrides
              .slice()
              .sort((a, b) => a.diaSemana - b.diaSemana)
              .map((o) => {
                const pausasDoDia = pausas.filter((p) => p.diaSemana === o.diaSemana);
                return (
                  <li key={o._key} className="border border-slate-200 rounded-md p-3 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-sm">{DIAS_SEMANA[o.diaSemana].label}</span>
                      <input type="time" value={o.horaInicio} onChange={(e) => updateOverride(o._key, { horaInicio: e.target.value })} className="input w-32" />
                      <span>–</span>
                      <input type="time" value={o.horaFim} onChange={(e) => updateOverride(o._key, { horaFim: e.target.value })} className="input w-32" />
                      <button type="button" onClick={() => removeOverride(o._key)} className="text-rose-600 text-sm ml-auto hover:underline">
                        remover
                      </button>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Pausas específicas do dia</span>
                        <button type="button" onClick={() => addPausa(o.diaSemana)} className="text-xs text-slate-700 hover:underline">
                          + adicionar pausa
                        </button>
                      </div>
                      {pausasDoDia.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Usa as pausas padrão.</p>
                      ) : (
                        <PausaList pausas={pausasDoDia} onUpdate={updatePausa} onRemove={removePausa} />
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      <div className="flex justify-end gap-3">
        {isEdit && (
          <button type="button" onClick={remove} disabled={removing} className="px-3 py-2 text-rose-700 hover:underline mr-auto disabled:opacity-50">
            {removing ? 'Removendo…' : 'Remover'}
          </button>
        )}
        <button type="button" onClick={() => navigate('/configuracoes/jornada')} className="px-4 py-2 rounded-md border border-slate-300 bg-white">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-slate-900 text-white disabled:opacity-50">
          {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar jornada'}
        </button>
      </div>

      <style>{`.input { padding: 0.5rem 0.75rem; border: 1px solid rgb(203 213 225); border-radius: 0.375rem; background: white; }`}</style>
    </form>
  );
}

function PausaList({
  pausas,
  onUpdate,
  onRemove,
}: {
  pausas: PausaForm[];
  onUpdate: (key: string, patch: Partial<PausaWire>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {pausas.map((p) => (
        <li key={p._key} className="flex flex-wrap gap-2 items-center">
          <select value={p.tipo} onChange={(e) => onUpdate(p._key, { tipo: e.target.value as TipoPausa })} className="input">
            {TIPO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {p.tipo === 'OUTRO' && (
            <input
              value={p.nome}
              onChange={(e) => onUpdate(p._key, { nome: e.target.value })}
              placeholder="Descrição"
              className="input flex-1 min-w-[120px]"
            />
          )}
          <input type="time" value={p.horaInicio} onChange={(e) => onUpdate(p._key, { horaInicio: e.target.value })} className="input" />
          <input type="time" value={p.horaFim} onChange={(e) => onUpdate(p._key, { horaFim: e.target.value })} className="input" />
          <button type="button" onClick={() => onRemove(p._key)} className="text-rose-600 text-sm px-2 hover:underline">
            remover
          </button>
        </li>
      ))}
    </ul>
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

