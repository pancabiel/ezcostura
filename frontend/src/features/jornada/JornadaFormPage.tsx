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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  if (loading) return <p className="text-muted-foreground">Carregando…</p>;

  const horas = Math.floor(padraoMin / 60);
  const minutos = padraoMin % 60;
  const pausasPadrao = pausas.filter((p) => p.diaSemana === null);

  return (
    <form onSubmit={submit} className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{isEdit ? 'Editar jornada' : 'Nova jornada'}</h2>
        <Button type="button" variant="link" onClick={() => navigate('/configuracoes/jornada')}>
          Voltar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="rounded-xl border bg-card p-6 flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="jornada-nome">Nome</FieldLabel>
          <Input id="jornada-nome" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Padrão, Meio período…" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="jornada-inicio">Início</FieldLabel>
            <Input id="jornada-inicio" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="jornada-fim">Fim</FieldLabel>
            <Input id="jornada-fim" type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
          </Field>
        </div>
        <p className="text-sm text-muted-foreground">
          Tempo trabalhado padrão: <span className="font-semibold text-foreground">{horas}h {minutos}min</span>
        </p>
      </section>

      <section className="rounded-xl border bg-card p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Pausas (padrão)</h3>
          <Button type="button" variant="link" size="sm" onClick={() => addPausa(null)}>
            + Adicionar pausa
          </Button>
        </div>
        {pausasPadrao.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sem pausas definidas.</p>
        ) : (
          <PausaList pausas={pausasPadrao} onUpdate={updatePausa} onRemove={removePausa} />
        )}
      </section>

      <section className="rounded-xl border bg-card p-6 flex flex-col gap-3">
        <h3 className="font-semibold">Horários especiais por dia da semana</h3>
        <p className="text-sm text-muted-foreground">
          Sobrescreve o horário padrão em dias específicos (ex.: sexta-feira mais curta).
        </p>
        <div className="grid grid-cols-7 gap-2">
          {DIAS_SEMANA.map((d) => {
            const ov = overridesByDia.get(d.value);
            return (
              <Button
                key={d.value}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => (ov ? null : addOverride(d.value))}
                disabled={Boolean(ov)}
                className={cn(
                  ov && 'border-emerald-300 bg-emerald-50 text-emerald-700 disabled:opacity-100 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300',
                )}
              >
                {d.short}
              </Button>
            );
          })}
        </div>
        {overrides.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sem horários especiais.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {overrides
              .slice()
              .sort((a, b) => a.diaSemana - b.diaSemana)
              .map((o) => {
                const pausasDoDia = pausas.filter((p) => p.diaSemana === o.diaSemana);
                return (
                  <li key={o._key} className="rounded-md border p-3 flex flex-col gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-sm">{DIAS_SEMANA[o.diaSemana].label}</span>
                      <Input type="time" value={o.horaInicio} onChange={(e) => updateOverride(o._key, { horaInicio: e.target.value })} className="w-32" />
                      <span>–</span>
                      <Input type="time" value={o.horaFim} onChange={(e) => updateOverride(o._key, { horaFim: e.target.value })} className="w-32" />
                      <Button type="button" variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => removeOverride(o._key)}>
                        remover
                      </Button>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Pausas específicas do dia</span>
                        <Button type="button" variant="link" size="sm" onClick={() => addPausa(o.diaSemana)}>
                          + adicionar pausa
                        </Button>
                      </div>
                      {pausasDoDia.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Usa as pausas padrão.</p>
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
          <Button type="button" variant="ghost" className="text-destructive mr-auto" onClick={remove} disabled={removing}>
            {removing ? 'Removendo…' : 'Remover'}
          </Button>
        )}
        <Button type="button" variant="outline" size="lg" onClick={() => navigate('/configuracoes/jornada')}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar jornada'}
        </Button>
      </div>
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
    <ul className="flex flex-col gap-2">
      {pausas.map((p) => (
        <li key={p._key} className="flex flex-wrap gap-2 items-center">
          <Select value={p.tipo} onValueChange={(v) => onUpdate(p._key, { tipo: v as TipoPausa })}>
            <SelectTrigger aria-label="Tipo de pausa">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TIPO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {p.tipo === 'OUTRO' && (
            <Input
              value={p.nome}
              onChange={(e) => onUpdate(p._key, { nome: e.target.value })}
              placeholder="Descrição"
              aria-label="Descrição da pausa"
              className="flex-1 min-w-[120px]"
            />
          )}
          <Input type="time" value={p.horaInicio} onChange={(e) => onUpdate(p._key, { horaInicio: e.target.value })} className="w-32" />
          <Input type="time" value={p.horaFim} onChange={(e) => onUpdate(p._key, { horaFim: e.target.value })} className="w-32" />
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onRemove(p._key)}>
            remover
          </Button>
        </li>
      ))}
    </ul>
  );
}
