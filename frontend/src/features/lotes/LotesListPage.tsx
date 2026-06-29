import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '../../db/dexie';
import { useConfirm } from '../../components/ConfirmDialog';
import { lotesRepo } from './lotesRepo';
import type { LoteLocal, SyncStatus } from '../../types/lote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';

export default function LotesListPage() {
  const [query, setQuery] = useState('');

  const lotes = useLiveQuery(async () => {
    const all = await getDb().lotes.toArray();
    // Mais recentes primeiro (createdAt, com fallback em updatedAt); finalizados ao final.
    const sortKey = (l: LoteLocal): string => l.createdAt ?? l.updatedAt;
    return all
      .filter((l) => !l.pendingDelete)
      .sort((a, b) => {
        if (a.finalizado !== b.finalizado) return a.finalizado ? 1 : -1;
        return sortKey(b).localeCompare(sortKey(a));
      });
  }, []);

  const filtered = useMemo(() => {
    if (!lotes) return undefined;
    const q = query.trim().toLowerCase();
    if (!q) return lotes;
    return lotes.filter(
      (l) => l.codigo.toLowerCase().includes(q) || l.nome.toLowerCase().includes(q),
    );
  }, [lotes, query]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Lotes</h2>
        <Button asChild>
          <Link to="/lotes/novo">+ Novo lote</Link>
        </Button>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por código ou nome…"
        className="w-full mb-4"
      />

      {filtered === undefined ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <Empty className="border">
          <EmptyTitle>Nenhum lote cadastrado ainda.</EmptyTitle>
          <EmptyDescription>Crie o primeiro lote para começar.</EmptyDescription>
        </Empty>
      ) : (
        <ul className="rounded-md border bg-card divide-y">
          {filtered.map((l) => (
            <LoteRow key={l.id} lote={l} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LoteRow({ lote }: { lote: LoteLocal }) {
  const confirm = useConfirm();
  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Remover lote',
      message: `Remover lote ${lote.codigo}?`,
      confirmLabel: 'Remover',
      variant: 'danger',
    });
    if (!ok) return;
    await lotesRepo.markDeleted(lote.id);
  };

  const toggleFinalizado = async () => {
    if (!lote.finalizado) {
      const ok = await confirm({
        title: 'Finalizar lote',
        message: `Finalizar lote ${lote.codigo}? Ele deixa de aparecer no facilitador e no gerenciador. Você pode reabrir depois.`,
        confirmLabel: 'Finalizar',
      });
      if (!ok) return;
    }
    await lotesRepo.setFinalizado(lote.id, !lote.finalizado);
  };

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <Link to={`/lotes/${lote.id}`} className="min-w-0 sm:flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-sm text-muted-foreground">{lote.codigo}</span>
          <span className="font-medium break-words">{lote.nome}</span>
          {lote.finalizado && <Badge variant="outline">finalizado</Badge>}
          <SyncBadge status={lote.syncStatus} />
        </div>
        {lote.descricao && (
          <p className="text-sm text-muted-foreground break-words mt-1">{lote.descricao}</p>
        )}
      </Link>
      <div className="flex shrink-0 items-center gap-1 sm:ml-4">
        <Button variant="ghost" size="sm" onClick={toggleFinalizado}>
          {lote.finalizado ? 'Reabrir' : 'Finalizar'}
        </Button>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDelete}>
          Remover
        </Button>
      </div>
    </li>
  );
}

function SyncBadge({ status }: { status: SyncStatus }) {
  if (status === 'synced') return null;
  if (status === 'pending') return <Badge variant="secondary">pendente</Badge>;
  return <Badge variant="destructive">erro</Badge>;
}
