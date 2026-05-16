import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { getDb } from '../../db/dexie';
import { normalizeTime } from './jornadaRepo';

export default function JornadasListPage() {
  const jornadas = useLiveQuery(async () => {
    const all = await getDb().jornadas.toArray();
    return all.filter((j) => !j.pendingDelete).sort((a, b) => a.nome.localeCompare(b.nome));
  }, []) ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Jornadas de trabalho</h2>
        <Link to="/configuracoes/jornada/nova" className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-800">
          + Nova jornada
        </Link>
      </div>

      {jornadas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-slate-500">
          Nenhuma jornada cadastrada.
        </div>
      ) : (
        <ul className="space-y-2">
          {jornadas.map((j) => (
            <li key={j.id}>
              <Link
                to={`/configuracoes/jornada/${j.id}`}
                className="block bg-white border border-slate-200 rounded-md p-4 hover:border-slate-400"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{j.nome}</span>
                  <span className="font-mono text-sm text-slate-600">
                    {normalizeTime(j.horaInicio)} – {normalizeTime(j.horaFim)}
                  </span>
                </div>
                {j.diasSemana.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    {j.diasSemana.length} dia(s) da semana com horário específico
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2">
        <Link to="/configuracoes/dias-especiais" className="text-sm text-slate-700 hover:underline">
          Configurar dias especiais →
        </Link>
      </div>
    </div>
  );
}
