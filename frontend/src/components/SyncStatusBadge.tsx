import { useSyncStore } from '../stores/syncStore';

export default function SyncStatusBadge() {
  const { connection, phase, pendingCount, lastError } = useSyncStore();

  let label: string;
  let cls: string;

  if (connection === 'offline') {
    label = `Offline${pendingCount ? ` · ${pendingCount} pendente(s)` : ''}`;
    cls = 'bg-amber-500/20 text-amber-100 border-amber-400';
  } else if (phase === 'syncing') {
    label = 'Sincronizando…';
    cls = 'bg-sky-500/20 text-sky-100 border-sky-400';
  } else if (phase === 'error') {
    label = `Erro de sync${pendingCount ? ` · ${pendingCount} pendente(s)` : ''}`;
    cls = 'bg-rose-500/20 text-rose-100 border-rose-400';
  } else if (pendingCount > 0) {
    label = `${pendingCount} pendente(s)`;
    cls = 'bg-slate-600/40 text-slate-100 border-slate-400';
  } else {
    label = 'Sincronizado';
    cls = 'bg-emerald-500/20 text-emerald-100 border-emerald-400';
  }

  return (
    <span
      title={lastError ?? undefined}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${cls}`}
    >
      <span className={`h-2 w-2 rounded-full ${
        connection === 'offline' ? 'bg-amber-300' :
        phase === 'syncing' ? 'bg-sky-300 animate-pulse' :
        phase === 'error' ? 'bg-rose-300' :
        pendingCount > 0 ? 'bg-slate-300' : 'bg-emerald-300'
      }`} />
      {label}
    </span>
  );
}
