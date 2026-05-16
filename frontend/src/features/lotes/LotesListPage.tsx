import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '../../db/dexie';
import { lotesRepo } from './lotesRepo';
import type { LoteLocal, SyncStatus } from '../../types/lote';

export default function LotesListPage() {
  const [query, setQuery] = useState('');

  const lotes = useLiveQuery(async () => {
    const all = await getDb().lotes.toArray();
    return all
      .filter((l) => !l.pendingDelete)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
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
        <Link
          to="/lotes/novo"
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800"
        >
          + Novo lote
        </Link>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por código ou nome…"
        className="w-full mb-4 px-4 py-3 rounded-md border border-slate-300 bg-white"
      />

      {filtered === undefined ? (
        <p className="text-slate-500">Carregando…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-md border border-slate-200 p-8 text-center text-slate-500">
          Nenhum lote cadastrado ainda.
        </div>
      ) : (
        <ul className="bg-white rounded-md border border-slate-200 divide-y divide-slate-100">
          {filtered.map((l) => (
            <LoteRow key={l.id} lote={l} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LoteRow({ lote }: { lote: LoteLocal }) {
  const handleDelete = async () => {
    if (!confirm(`Remover lote ${lote.codigo}?`)) return;
    await lotesRepo.markDeleted(lote.id);
  };

  return (
    <li className="flex items-center justify-between p-4">
      <Link to={`/lotes/${lote.id}`} className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm text-slate-500">{lote.codigo}</span>
          <span className="font-medium truncate">{lote.nome}</span>
          <SyncBadge status={lote.syncStatus} />
        </div>
        {lote.descricao && (
          <p className="text-sm text-slate-500 truncate mt-1">{lote.descricao}</p>
        )}
      </Link>
      <button
        onClick={handleDelete}
        className="ml-4 text-sm text-rose-600 hover:underline"
      >
        Remover
      </button>
    </li>
  );
}

function SyncBadge({ status }: { status: SyncStatus }) {
  if (status === 'synced') return null;
  const cls =
    status === 'pending'
      ? 'bg-slate-100 text-slate-600'
      : 'bg-rose-100 text-rose-700';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>
      {status === 'pending' ? 'pendente' : 'erro'}
    </span>
  );
}
