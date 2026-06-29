import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '../../db/dexie';
import { alocacoesRepo } from './alocacoesRepo';
import { useConfirm } from '../../components/ConfirmDialog';
import { resolverJornadaEfetiva } from '../jornada/jornadaRepo';
import { useAuthStore, canGerir } from '../../stores/authStore';
import { selectableLotes } from '../lotes/lotesRepo';
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
  /**
   * 'gerenciador' = planejamento do dia (1ª alocação nasce no início da jornada);
   * 'facilitador' = troca em tempo real no chão de fábrica (nasce na hora atual).
   */
  contexto?: 'gerenciador' | 'facilitador';
  onClose: () => void;
}

export default function AlocacaoModal({
  operarioId, operarioNome, data, alocacao, defaultHorario,
  contexto = 'gerenciador', onClose,
}: Props) {
  // Master (ADMIN/GERENTE) escolhe o horário livremente; o chão de fábrica (SUPERVISOR/
  // OPERADOR) recebe o horário travado — o servidor também carimba/preserva (defesa real,
  // ver AlocacaoService).
  const isMaster = canGerir(useAuthStore((s) => s.session?.role));

  const lotesRaw = useLiveQuery(() => getDb().lotes.toArray(), []);
  const jornadasRaw = useLiveQuery(() => getDb().jornadas.toArray(), []);
  const diasEspeciaisRaw = useLiveQuery(() => getDb().diasEspeciais.toArray(), []);
  const operario = useLiveQuery(() => getDb().operarios.get(operarioId), [operarioId]);
  const existentesRaw = useLiveQuery(
    () => getDb().alocacoes.where('[operarioId+data]').equals([operarioId, data]).toArray(),
    [operarioId, data],
  );

  const lotes = lotesRaw ?? [];
  const jornadas = jornadasRaw ?? [];
  const diasEspeciais = diasEspeciaisRaw ?? [];

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

  // Default do horário pela jornada (item 2). Roda uma única vez, depois que as queries
  // do Dexie carregaram, e só para alocação NOVA (edição mantém o horário salvo).
  const horarioInicializado = useRef(false);
  useEffect(() => {
    if (horarioInicializado.current) return;
    if (alocacao || defaultHorario) { horarioInicializado.current = true; return; }
    // Espera tudo carregar pra resolver a jornada e saber se já há alocação no dia.
    if (operario === undefined || existentesRaw === undefined
      || jornadasRaw === undefined || diasEspeciaisRaw === undefined) return;

    const temAnterior = existentesRaw.some((a) => !a.pendingDelete);
    let def: string;
    if (contexto === 'facilitador') {
      // Troca em tempo real: hora atual (travada para o funcionário comum).
      def = defaultNowHHMM();
    } else if (!temAnterior) {
      // 1ª alocação do dia no planejamento: início da jornada do operário.
      def = horarioManha ?? defaultNowHHMM();
    } else {
      // 2ª+ alocação pré-planejada: fim do almoço (atalho "Tarde").
      def = horarioTarde ?? defaultNowHHMM();
    }
    setHorarioInicio(def);
    horarioInicializado.current = true;
  }, [operario, existentesRaw, jornadasRaw, diasEspeciaisRaw, alocacao, defaultHorario,
      contexto, horarioManha, horarioTarde]);

  // Sugestão de lote: quando só existe um lote não finalizado, já o deixa selecionado
  // ao abrir o modal (alocação NOVA — edição mantém o lote salvo). Roda uma única vez,
  // depois que os lotes do Dexie carregaram.
  const loteInicializado = useRef(false);
  useEffect(() => {
    if (loteInicializado.current) return;
    if (alocacao || loteId) { loteInicializado.current = true; return; }
    if (lotesRaw === undefined) return; // espera os lotes carregarem
    const sel = selectableLotes(lotes);
    if (sel.length === 1) setLoteId(sel[0].id);
    loteInicializado.current = true;
  }, [alocacao, loteId, lotesRaw, lotes]);

  const lote: LoteLocal | undefined = useMemo(
    () => lotes.find((l) => l.id === loteId),
    [lotes, loteId],
  );

  // Lotes oferecidos no select: só os ativos, do mais recente ao mais antigo.
  // Mantém o lote já selecionado visível mesmo se finalizado (edição de alocação antiga).
  const lotesSelecionaveis = useMemo(() => {
    const sel = selectableLotes(lotes);
    if (loteId && lote && !sel.some((l) => l.id === loteId)) return [lote, ...sel];
    return sel;
  }, [lotes, loteId, lote]);

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
                autoFocus={isMaster}
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
                readOnly={!isMaster}
                aria-readonly={!isMaster}
                className={isMaster ? undefined : 'cursor-not-allowed opacity-70'}
                required
              />
              {isMaster ? (
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
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Horário registrado automaticamente. Só o supervisor pode alterar.
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="aloc-lote">Lote</FieldLabel>
              <Select value={loteId} onValueChange={setLoteId}>
                <SelectTrigger id="aloc-lote" aria-label="Lote" className="w-full">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {lotesSelecionaveis.map((l) => (
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
