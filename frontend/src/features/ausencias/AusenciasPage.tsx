import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '../../db/dexie';
import { ausenciasRepo } from './ausenciasRepo';
import AusenciaModal from './AusenciaModal';
import type { AusenciaLocal, TipoAusencia } from '../../types/ausencia';

const TIPO_LABEL: Record<TipoAusencia, string> = {
  ATESTADO: 'Atestado',
  FALTA: 'Falta',
  FERIAS: 'Férias',
  FOLGA: 'Folga',
};

const TIPO_COLOR: Record<TipoAusencia, string> = {
  ATESTADO: 'bg-amber-100 text-amber-800',
  FALTA: 'bg-rose-100 text-rose-800',
  FERIAS: 'bg-sky-100 text-sky-800',
  FOLGA: 'bg-slate-100 text-slate-700',
};

export default function AusenciasPage() {
  const [editing, setEditing] = useState<AusenciaLocal | null>(null);
  const [creating, setCreating] = useState(false);
  const [filtroOperario, setFiltroOperario] = useState<string>('');

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
        <button
          onClick={() => setCreating(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800"
        >
          + Nova ausência
        </button>
      </div>

      <div className="mb-4">
        <select
          value={filtroOperario}
          onChange={(e) => setFiltroOperario(e.target.value)}
          className="px-4 py-3 rounded-md border border-slate-300 bg-white"
        >
          <option value="">Todos os operários</option>
          {operarios.map((o) => (
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-md border border-slate-200 p-8 text-center text-slate-500">
          Nenhuma ausência registrada.
        </div>
      ) : (
        <ul className="bg-white rounded-md border border-slate-200 divide-y divide-slate-100">
          {filtered.map((a) => {
            const op = operarioById.get(a.operarioId);
            return (
              <li key={a.id} className="flex items-center justify-between p-4 gap-4">
                <button onClick={() => setEditing(a)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-medium truncate">{op?.nome ?? '?'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLOR[a.tipo]}`}>
                      {TIPO_LABEL[a.tipo]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {formatRange(a.dataInicio, a.dataFim)}
                    {a.observacao && <span className="text-slate-500"> · {a.observacao}</span>}
                  </p>
                </button>
                <button
                  onClick={() => confirm('Remover esta ausência?') && ausenciasRepo.markDeleted(a.id)}
                  className="text-rose-600 text-sm hover:underline shrink-0"
                >
                  remover
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {(creating || editing) && (
        <AusenciaModal
          ausencia={editing ?? undefined}
          operarios={operarios}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
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
