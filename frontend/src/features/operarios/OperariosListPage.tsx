import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import { operariosRepo } from './operariosRepo';
import type { OperarioLocal } from '../../types/operario';

type Filtro = 'todos' | 'ativos' | 'inativos';

export default function OperariosListPage() {
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('ativos');

  const operarios = useLiveQuery(async () => {
    const all = await db.operarios.toArray();
    return all.filter((o) => !o.pendingDelete).sort((a, b) => a.nome.localeCompare(b.nome));
  }, []);

  const filtered = useMemo(() => {
    if (!operarios) return undefined;
    const q = query.trim().toLowerCase();
    return operarios.filter((o) => {
      if (filtro === 'ativos' && !o.ativo) return false;
      if (filtro === 'inativos' && o.ativo) return false;
      if (q && !o.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [operarios, query, filtro]);

  const toggleAtivo = async (o: OperarioLocal) => {
    await operariosRepo.update(o.id, { ativo: !o.ativo });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Operários</h2>
        <Link
          to="/operarios/novo"
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800"
        >
          + Novo operário
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome…"
          className="flex-1 px-4 py-3 rounded-md border border-slate-300 bg-white"
        />
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as Filtro)}
          className="px-4 py-3 rounded-md border border-slate-300 bg-white"
        >
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      {filtered === undefined ? (
        <p className="text-slate-500">Carregando…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-md border border-slate-200 p-8 text-center text-slate-500">
          Nenhum operário encontrado.
        </div>
      ) : (
        <ul className="bg-white rounded-md border border-slate-200 divide-y divide-slate-100">
          {filtered.map((o) => (
            <li key={o.id} className="flex items-center justify-between p-4">
              <Link to={`/operarios/${o.id}`} className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3">
                  <span className="font-medium truncate">{o.nome}</span>
                  {!o.ativo && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      inativo
                    </span>
                  )}
                </div>
                {(o.cpf || o.telefone) && (
                  <p className="text-sm text-slate-500 truncate mt-1">
                    {[o.cpf, o.telefone].filter(Boolean).join(' · ')}
                  </p>
                )}
              </Link>
              <button
                onClick={() => toggleAtivo(o)}
                className="ml-4 text-sm text-slate-700 hover:underline"
              >
                {o.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
