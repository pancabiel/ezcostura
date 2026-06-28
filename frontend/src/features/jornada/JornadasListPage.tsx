import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { getDb } from '../../db/dexie';
import { normalizeTime } from './jornadaRepo';
import { Button } from '@/components/ui/button';
import { Empty, EmptyTitle } from '@/components/ui/empty';

export default function JornadasListPage() {
  const jornadas = useLiveQuery(async () => {
    const all = await getDb().jornadas.toArray();
    return all.filter((j) => !j.pendingDelete).sort((a, b) => a.nome.localeCompare(b.nome));
  }, []) ?? [];

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Jornadas de trabalho</h2>
        <Button asChild>
          <Link to="/configuracoes/jornada/nova">+ Nova jornada</Link>
        </Button>
      </div>

      {jornadas.length === 0 ? (
        <Empty className="border">
          <EmptyTitle>Nenhuma jornada cadastrada.</EmptyTitle>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {jornadas.map((j) => (
            <li key={j.id}>
              <Link
                to={`/configuracoes/jornada/${j.id}`}
                className="block rounded-md border bg-card p-4 transition-colors hover:border-ring"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{j.nome}</span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {normalizeTime(j.horaInicio)} – {normalizeTime(j.horaFim)}
                  </span>
                </div>
                {j.diasSemana.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {j.diasSemana.length} dia(s) da semana com horário específico
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2">
        <Link to="/configuracoes/dias-especiais" className="text-sm text-foreground hover:underline">
          Configurar dias especiais →
        </Link>
      </div>
    </div>
  );
}
