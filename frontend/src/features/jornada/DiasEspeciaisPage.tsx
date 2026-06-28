import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { getDb } from '../../db/dexie';
import { diasEspeciaisRepo, normalizeTime } from './jornadaRepo';
import { useConfirm } from '../../components/ConfirmDialog';
import type { DiaEspecialLocal, DiaEspecialPausaWire, TipoPausa } from '../../types/jornada';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Dias especiais</h2>
        <Button onClick={() => setEditing('new')}>+ Novo dia especial</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Sobrescreve o horário de trabalho para uma data específica e para os funcionários selecionados (ex.: véspera de feriado).
      </p>

      {dias.length === 0 ? (
        <Empty className="border">
          <EmptyTitle>Nenhum dia especial cadastrado.</EmptyTitle>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {dias.map((d) => {
            const opNomes = d.operarioIds
              .map((id) => operarios.find((o) => o.id === id)?.nome)
              .filter(Boolean);
            return (
              <li
                key={d.id}
                onClick={() => setEditing(d)}
                className="rounded-md border bg-card p-4 cursor-pointer transition-colors hover:border-ring"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {formatDateBR(d.data)}
                    {d.descricao ? <span className="text-muted-foreground font-normal"> · {d.descricao}</span> : null}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {normalizeTime(d.horaInicio)} – {normalizeTime(d.horaFim)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
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
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{dia ? 'Editar dia especial' : 'Novo dia especial'}</DialogTitle>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="de-data">Data</FieldLabel>
              <Input id="de-data" autoFocus type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="de-descricao">Descrição</FieldLabel>
              <Input id="de-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Véspera de feriado" />
            </Field>
            <Field>
              <FieldLabel htmlFor="de-inicio">Início</FieldLabel>
              <Input id="de-inicio" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="de-fim">Fim</FieldLabel>
              <Input id="de-fim" type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} required />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Pausas</span>
              <Button type="button" variant="link" size="sm" onClick={addPausa}>
                + Adicionar pausa
              </Button>
            </div>
            {pausas.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Sem pausas.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {pausas.map((p) => (
                  <li key={p._key} className="flex flex-wrap gap-2 items-center">
                    <Select value={p.tipo} onValueChange={(v) => updatePausa(p._key, { tipo: v as TipoPausa })}>
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
                      <Input value={p.nome} onChange={(e) => updatePausa(p._key, { nome: e.target.value })} placeholder="Descrição" aria-label="Descrição da pausa" className="flex-1 min-w-[120px]" />
                    )}
                    <Input type="time" value={p.horaInicio} onChange={(e) => updatePausa(p._key, { horaInicio: e.target.value })} className="w-32" />
                    <Input type="time" value={p.horaFim} onChange={(e) => updatePausa(p._key, { horaFim: e.target.value })} className="w-32" />
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removePausa(p._key)}>
                      remover
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Funcionários ({opIds.size}/{ativosCount})</span>
              <div className="flex gap-2">
                <Button type="button" variant="link" size="sm" onClick={() => setOpIds(new Set(operarios.map((o) => o.id)))}>
                  marcar todos
                </Button>
                <Button type="button" variant="link" size="sm" onClick={() => setOpIds(new Set())}>
                  limpar
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto rounded-md border p-2">
              {operarios.length === 0 ? (
                <p className="text-xs text-muted-foreground italic col-span-2">Nenhum funcionário ativo.</p>
              ) : operarios.map((o) => (
                <FieldLabel
                  key={o.id}
                  htmlFor={`de-op-${o.id}`}
                  className="flex items-center gap-2 text-sm py-1 px-2 rounded font-normal hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox id={`de-op-${o.id}`} checked={opIds.has(o.id)} onCheckedChange={() => toggleOp(o.id)} />
                  <span className="truncate">{o.nome}</span>
                </FieldLabel>
              ))}
            </div>
          </div>

          <DialogFooter>
            {dia && (
              <Button type="button" variant="ghost" className="text-destructive sm:mr-auto" onClick={remove}>
                Remover
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatDateBR(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}
