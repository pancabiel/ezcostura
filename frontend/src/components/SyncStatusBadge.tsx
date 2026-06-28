import { useSyncStore } from '../stores/syncStore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function SyncStatusBadge() {
  const { connection, phase, pendingCount, lastError } = useSyncStore();

  let label: string;
  let dot: string;

  if (connection === 'offline') {
    label = `Offline${pendingCount ? ` · ${pendingCount} pendente(s)` : ''}`;
    dot = 'bg-amber-400';
  } else if (phase === 'syncing') {
    label = 'Sincronizando…';
    dot = 'bg-sky-400 animate-pulse';
  } else if (phase === 'error') {
    label = `Erro de sync${pendingCount ? ` · ${pendingCount} pendente(s)` : ''}`;
    dot = 'bg-destructive';
  } else if (pendingCount > 0) {
    label = `${pendingCount} pendente(s)`;
    dot = 'bg-primary-foreground/60';
  } else {
    label = 'Sincronizado';
    dot = 'bg-emerald-400';
  }

  return (
    <Badge
      title={lastError ?? undefined}
      className="border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground"
    >
      <span className={cn('size-2 rounded-full', dot)} />
      {label}
    </Badge>
  );
}
