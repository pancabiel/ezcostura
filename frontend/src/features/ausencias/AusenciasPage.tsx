import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '../../db/dexie';
import { ausenciasRepo } from './ausenciasRepo';
import { useConfirm } from '../../components/ConfirmDialog';
import AusenciaModal from './AusenciaModal';
import type { AusenciaLocal, TipoAusencia } from '../../types/ausencia';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TIPO_LABEL: Record<TipoAusencia, string> = {
  ATESTADO: 'Atestado',
  FALTA: 'Falta',
  FERIAS: 'Férias',
  FOLGA: 'Folga',
};

const TIPO_COLOR: Record<TipoAusencia, string> = {
  ATESTADO: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
  FALTA: 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300',
  FERIAS: 'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300',
  FOLGA: '',
};

const ALL = '__all__';

export default function AusenciasPage() {
  const [editing, setEditing] = useState<AusenciaLocal | null>(null);
  const [creating, setCreating] = useState(false);
  const [filtroOperario, setFiltroOperario] = useState<string>('');
  const confirm = useConfirm();

  const removeAusencia = async (id: string) => {
    const ok = await confirm({
      title: 'Remover ausência',
      message: 'Remover esta ausência?',
      confirmLabel: 'Remover',
      variant: 'danger',
    });
    if (ok) await ausenciasRepo.markDeleted(id);
  };

  const ausencias = useLiveQuery(
    async () => (await getDb().ausencias.toArray())
      .filter((a) => !a.pendingDelete)
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio)),
    [],
  ) ?? [];

  const operarios = useLiveQuery(
    async () => (await getDb().operarios.toArray())
      .filter((o) => !o.pendingDelete)
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [],
  ) ?? [];

  const operarioById = useMemo(() => new Map(operarios.map((o) => [o.id, o])), [operarios]);

  const filtered = useMemo(() => {
    if (!filtroOperario) return ausencias;
    return ausencias.filter((a) => a.operarioId === filtroOperario);
  }, [ausencias, filtroOperario]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Ausências</h2>
        <Button onClick={() => setCreating(true)}>+ Nova ausência</Button>
      </div>

      <div className="mb-4">
        <Select
          value={filtroOperario || ALL}
          onValueChange={(v) => setFiltroOperario(v === ALL ? '' : v)}
        >
          <SelectTrigger aria-label="Filtrar por funcionário">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>Todos os funcionários</SelectItem>
              {operarios.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Empty className="border">
          <EmptyTitle>Nenhuma ausência registrada.</EmptyTitle>
        </Empty>
      ) : (
        <ul className="rounded-md border bg-card divide-y">
          {filtered.map((a) => {
            const op = operarioById.get(a.operarioId);
            return (
              <li key={a.id} className="flex items-center justify-between p-4 gap-4">
                <button onClick={() => setEditing(a)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-medium truncate">{op?.nome ?? '?'}</span>
                    <Badge
                      variant={a.tipo === 'FOLGA' ? 'secondary' : 'default'}
                      className={cn(TIPO_COLOR[a.tipo])}
                    >
                      {TIPO_LABEL[a.tipo]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatRange(a.dataInicio, a.dataFim)}
                    {a.observacao && <span> · {a.observacao}</span>}
                  </p>
                </button>
                <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => removeAusencia(a.id)}>
                  remover
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <AusenciaModal
        key={editing?.id ?? (creating ? 'new' : 'closed')}
        open={creating || !!editing}
        ausencia={editing ?? undefined}
        operarios={operarios}
        onClose={() => { setCreating(false); setEditing(null); }}
      />
    </div>
  );
}

function formatRange(de: string, ate: string): string {
  if (de === ate) return formatDate(de);
  return `${formatDate(de)} → ${formatDate(ate)}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
