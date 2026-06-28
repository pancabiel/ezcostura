import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '../../db/dexie';
import { alocacoesRepo } from './alocacoesRepo';
import { useConfirm } from '../../components/ConfirmDialog';
import { resolverJornadaEfetiva } from '../jornada/jornadaRepo';
import type { AlocacaoLocal } from '../../types/alocacao';
import type { LoteLocal } from '../../types/lote';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const confirm = useConfirm();

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
    const ok = await confirm({
      title: 'Remover alocação',
      message: 'Remover esta alocação?',
      confirmLabel: 'Remover',
      variant: 'danger',
    });
    if (!ok) return;
    await alocacoesRepo.markDeleted(alocacao.id);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{alocacao ? 'Editar alocação' : 'Nova alocação'}</DialogTitle>
            <DialogDescription>{operarioNome} · {formatDate(data)}</DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="aloc-horario">Horário de início</FieldLabel>
              <Input
                id="aloc-horario"
                autoFocus
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => horarioManha && setHorarioInicio(horarioManha)}
                  disabled={!horarioManha}
                >
                  Manhã{horarioManha ? ` (${horarioManha})` : ''}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => horarioTarde && setHorarioInicio(horarioTarde)}
                  disabled={!horarioTarde}
                  title={horarioTarde ? undefined : 'Configure uma pausa do tipo Almoço na Jornada'}
                >
                  Tarde{horarioTarde ? ` (${horarioTarde})` : ''}
                </Button>
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="aloc-lote">Lote</FieldLabel>
              <Select value={loteId} onValueChange={setLoteId}>
                <SelectTrigger id="aloc-lote" aria-label="Lote" className="w-full">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {lotes.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.codigo} — {l.nome}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="aloc-operacao">Operação</FieldLabel>
              <Select value={operacaoId} onValueChange={setOperacaoId} disabled={!lote}>
                <SelectTrigger id="aloc-operacao" aria-label="Operação" className="w-full">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {lote?.operacoes.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.nome} (meta {o.metaPorHora}/h)
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <DialogFooter>
            {alocacao && (
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

function defaultNowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
}
