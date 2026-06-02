import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuthStore } from '../../stores/portalAuthStore';
import { meApi, type DesempenhoDia } from './portalApi';

function pctColor(pct: number) {
  if (pct >= 100) return { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' };
  if (pct >= 75) return { bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800' };
  return { bar: 'bg-rose-500', badge: 'bg-rose-100 text-rose-800' };
}

export default function PortalHomePage() {
  const navigate = useNavigate();
  const session = usePortalAuthStore((s) => s.session);
  const setSession = usePortalAuthStore((s) => s.setSession);
  const [data, setData] = useState<DesempenhoDia | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErro(null);
    try {
      const d = await meApi.hoje();
      setData(d);
    } catch {
      setErro('Não foi possível carregar seu progresso.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function sair() {
    setSession(null);
    navigate('/meu/login', { replace: true });
  }

  const cor = pctColor(data?.totalPct ?? 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* topo */}
      <header className="bg-teal-700 text-white px-4 pt-6 pb-8 shadow-sm">
        <div className="max-w-md mx-auto flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-teal-100">Olá,</p>
            <h1 className="text-xl font-bold leading-tight">{session?.nome ?? '—'}</h1>
            <p className="text-[11px] text-teal-100 mt-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={sair}
            className="text-xs bg-teal-800 hover:bg-teal-900 text-white px-3 py-1.5 rounded-md"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-5 space-y-4">
        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500">
            Carregando…
          </div>
        )}

        {erro && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">
            {erro}
            <button onClick={load} className="ml-2 underline">
              tentar de novo
            </button>
          </div>
        )}

        {data && !loading && (
          <>
            {/* KPI principal */}
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              {data.ausente ? (
                <div className="text-center py-4">
                  <p className="text-sm font-medium text-slate-700">Você está marcado como ausente hoje.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Hoje</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cor.badge}`}>
                      {data.totalPct}%
                    </span>
                  </div>
                  <p className="text-4xl font-bold text-slate-900 mt-1">
                    {data.totalProduzido}
                    <span className="text-lg font-normal text-slate-500"> / {data.totalMeta} peças</span>
                  </p>
                  <div className="bg-slate-100 rounded-full h-3 mt-3 overflow-hidden">
                    <div
                      className={`h-3 ${cor.bar} transition-all`}
                      style={{ width: `${Math.min(100, data.totalPct)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Jornada: {data.horaInicio} às {data.horaFim}
                  </p>
                </>
              )}
            </section>

            {/* Detalhe por alocação */}
            {!data.ausente && data.itens.length > 0 && (
              <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                <h2 className="font-semibold text-slate-900 text-sm mb-3">Por operação</h2>
                <div className="space-y-3">
                  {data.itens.map((it) => {
                    const c = pctColor(it.pct);
                    return (
                      <div key={it.alocacaoId} className="border border-slate-100 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 text-sm truncate">
                              {it.operacaoNome ?? 'Operação'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              Lote {it.loteCodigo ?? '—'} · início {it.horarioInicio} · {it.horas.toFixed(1)} h · meta {it.metaPorHora}/h
                            </p>
                          </div>
                          <span className={`text-[11px] shrink-0 px-2 py-0.5 rounded-full ${c.badge}`}>
                            {it.pct}%
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-2 text-sm">
                          <span className="font-mono font-semibold text-slate-900">{it.produzido}</span>
                          <span className="text-slate-400">/</span>
                          <span className="font-mono text-slate-500">{it.meta}</span>
                          <span className="text-slate-400 text-[11px]">peças</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                          <div
                            className={`h-2 ${c.bar} transition-all`}
                            style={{ width: `${Math.min(100, it.pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {!data.ausente && data.itens.length === 0 && (
              <section className="bg-white border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
                Você ainda não tem operações alocadas para hoje.
              </section>
            )}

            <button
              onClick={load}
              className="w-full bg-white border border-slate-200 rounded-md py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Atualizar
            </button>

            <button
              onClick={() => navigate('/meu/pin')}
              className="w-full text-sm font-medium text-teal-700 hover:text-teal-900 py-2"
            >
              Trocar meu PIN
            </button>
          </>
        )}
      </main>
    </div>
  );
}
