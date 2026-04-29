import { useEffect, useMemo, useState } from 'react';
import { jornadaRepo, jornadaWorkingMinutes, normalizeTime } from './jornadaRepo';
import type { ConfiguracaoJornadaWire, PausaWire, TipoPausa } from '../../types/jornada';
import { v4 as uuid } from 'uuid';

interface PausaForm extends PausaWire {
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

export default function ConfiguracaoJornadaPage() {
  const [horaInicio, setHoraInicio] = useState('07:00');
  const [horaFim, setHoraFim] = useState('17:00');
  const [pausas, setPausas] = useState<PausaForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const data = await jornadaRepo.refresh();
      if (cancelled) return;
      setHoraInicio(normalizeTime(data.horaInicio));
      setHoraFim(normalizeTime(data.horaFim));
      setPausas(data.pausas.map((p) => ({
        _key: uuid(),
        id: p.id,
        nome: p.nome,
        horaInicio: normalizeTime(p.horaInicio),
        horaFim: normalizeTime(p.horaFim),
        tipo: p.tipo ?? 'OUTRO',
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const totalMin = useMemo(() => {
    return jornadaWorkingMinutes({ horaInicio, horaFim, pausas });
  }, [horaInicio, horaFim, pausas]);

  const addPausa = () => {
    setPausas((p) => [...p, { _key: uuid(), nome: 'Café', horaInicio: '09:30', horaFim: '09:45', tipo: 'CAFE' }]);
  };

  const updatePausa = (key: string, patch: Partial<PausaWire>) => {
    setPausas((p) =>
      p.map((x) => {
        if (x._key !== key) return x;
        const merged = { ...x, ...patch };
        if (patch.tipo && patch.tipo !== 'OUTRO') {
          merged.nome = FIXED_NOME[patch.tipo];
        } else if (patch.tipo === 'OUTRO' && (x.tipo !== 'OUTRO' || !x.nome.trim())) {
          merged.nome = '';
        }
        return merged;
      }),
    );
  };

  const removePausa = (key: string) => {
    setPausas((p) => p.filter((x) => x._key !== key));
  };

  const validate = (): string | null => {
    if (horaFim <= horaInicio) return 'Hora fim deve ser maior que hora início.';
    for (const p of pausas) {
      if (p.tipo === 'OUTRO' && !p.nome.trim()) return 'Pausa do tipo Outro requer descrição.';
      if (p.horaFim <= p.horaInicio) return `Pausa "${p.nome || p.tipo}" tem horário inválido.`;
      if (p.horaInicio < horaInicio || p.horaFim > horaFim) {
        return `Pausa "${p.nome || p.tipo}" está fora da jornada.`;
      }
    }
    const sorted = [...pausas].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].horaInicio < sorted[i - 1].horaFim) {
        return `Pausas "${sorted[i - 1].nome}" e "${sorted[i].nome}" se sobrepõem.`;
      }
    }
    if (pausas.filter((p) => p.tipo === 'ALMOCO').length > 1) {
      return 'Apenas uma pausa de Almoço é permitida.';
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const msg = validate();
    if (msg) { setError(msg); return; }
    setSaving(true);
    try {
      const payload: ConfiguracaoJornadaWire = {
        horaInicio,
        horaFim,
        pausas: pausas.map(({ _key: _ignore, ...rest }) => rest),
      };
      await jornadaRepo.save(payload);
      setInfo('Jornada salva.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Carregando…</p>;

  const horas = Math.floor(totalMin / 60);
  const minutos = totalMin % 60;

  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-semibold">Jornada de trabalho</h2>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-md">{error}</div>}
      {info && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-md">{info}</div>}

      <div className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Início">
            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="input" />
          </Field>
          <Field label="Fim">
            <input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} className="input" />
          </Field>
        </div>
        <p className="text-sm text-slate-600">
          Tempo trabalhado por dia: <span className="font-semibold">{horas}h {minutos}min</span>
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Pausas</h3>
          <button type="button" onClick={addPausa} className="text-sm text-slate-700 hover:underline">
            + Adicionar pausa
          </button>
        </div>
        {pausas.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Sem pausas definidas.</p>
        ) : (
          <ul className="space-y-2">
            {pausas.map((p) => (
              <li key={p._key} className="flex flex-wrap gap-2 items-center">
                <select
                  value={p.tipo}
                  onChange={(e) => updatePausa(p._key, { tipo: e.target.value as TipoPausa })}
                  className="input"
                >
                  {TIPO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {p.tipo === 'OUTRO' && (
                  <input
                    value={p.nome}
                    onChange={(e) => updatePausa(p._key, { nome: e.target.value })}
                    placeholder="Descrição"
                    className="input flex-1 min-w-[120px]"
                  />
                )}
                <input
                  type="time"
                  value={p.horaInicio}
                  onChange={(e) => updatePausa(p._key, { horaInicio: e.target.value })}
                  className="input"
                />
                <input
                  type="time"
                  value={p.horaFim}
                  onChange={(e) => updatePausa(p._key, { horaFim: e.target.value })}
                  className="input"
                />
                <button
                  type="button"
                  onClick={() => removePausa(p._key)}
                  className="text-rose-600 text-sm px-2 hover:underline"
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-slate-900 text-white disabled:opacity-50">
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      <style>{`.input { padding: 0.5rem 0.75rem; border: 1px solid rgb(203 213 225); border-radius: 0.375rem; background: white; }`}</style>
    </form>
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
