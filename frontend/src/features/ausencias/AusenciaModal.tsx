import { useState } from 'react';
import { ausenciasRepo } from './ausenciasRepo';
import type { AusenciaLocal, TipoAusencia } from '../../types/ausencia';
import type { OperarioLocal } from '../../types/operario';
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
import { Textarea } from '@/components/ui/textarea';
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
  open: boolean;
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

export default function AusenciaModal({ open, ausencia, operarios, onClose }: Props) {
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar ausência' : 'Nova ausência'}</DialogTitle>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="aus-operario">Funcionário</FieldLabel>
              <Select value={operarioId} onValueChange={setOperarioId}>
                <SelectTrigger id="aus-operario" aria-label="Funcionário" className="w-full">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {operarios.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="aus-inicio">Data início</FieldLabel>
                <Input id="aus-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="aus-fim">Data fim</FieldLabel>
                <Input id="aus-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="aus-tipo">Tipo</FieldLabel>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAusencia)}>
                <SelectTrigger id="aus-tipo" aria-label="Tipo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="aus-obs">Observação</FieldLabel>
              <Textarea id="aus-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} />
            </Field>
          </FieldGroup>

          <DialogFooter>
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
