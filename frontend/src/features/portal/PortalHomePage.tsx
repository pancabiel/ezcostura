import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuthStore } from '../../stores/portalAuthStore';
import { meApi, type DesempenhoDia } from './portalApi';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function pctColor(pct: number) {
  if (pct >= 100) return { bar: 'bg-emerald-500', badge: 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300' };
  if (pct >= 75) return { bar: 'bg-amber-500', badge: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300' };
  return { bar: 'bg-rose-500', badge: 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300' };
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
    <div className="min-h-screen bg-muted/40 pb-8">
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
          <Button
            size="sm"
            onClick={sair}
            className="bg-teal-800 text-white hover:bg-teal-900"
          >
            Sair
          </Button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-5 flex flex-col gap-4">
        {loading && (
          <Card>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        )}

        {erro && (
          <Alert variant="destructive">
            <AlertDescription>
              {erro}
              <Button variant="link" size="sm" className="ml-1 h-auto p-0" onClick={load}>
                tentar de novo
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {data && !loading && (
          <>
            {/* KPI principal */}
            <Card>
              <CardContent>
                {data.ausente ? (
                  <div className="text-center py-4">
                    <p className="text-sm font-medium text-foreground">Você está marcado como ausente hoje.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Hoje</p>
                      <Badge className={cn(cor.badge)}>{data.totalPct}%</Badge>
                    </div>
                    <p className="text-4xl font-bold text-foreground mt-1">
                      {data.totalProduzido}
                      <span className="text-lg font-normal text-muted-foreground"> / {data.totalMeta} peças</span>
                    </p>
                    <div className="bg-muted rounded-full h-3 mt-3 overflow-hidden">
                      <div
                        className={cn('h-3 transition-all', cor.bar)}
                        style={{ width: `${Math.min(100, data.totalPct)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Jornada: {data.horaInicio} às {data.horaFim}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Detalhe por alocação */}
            {!data.ausente && data.itens.length > 0 && (
              <Card>
                <CardContent>
                  <h2 className="font-semibold text-foreground text-sm mb-3">Por operação</h2>
                  <div className="flex flex-col gap-3">
                    {data.itens.map((it) => {
                      const c = pctColor(it.pct);
                      return (
                        <div key={it.alocacaoId} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">
                                {it.operacaoNome ?? 'Operação'}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                Lote {it.loteCodigo ?? '—'} · início {it.horarioInicio} · {it.horas.toFixed(1)} h · meta {it.metaPorHora}/h
                              </p>
                            </div>
                            <Badge className={cn('shrink-0', c.badge)}>{it.pct}%</Badge>
                          </div>
                          <div className="flex items-baseline gap-2 mt-2 text-sm">
                            <span className="font-mono font-semibold text-foreground">{it.produzido}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="font-mono text-muted-foreground">{it.meta}</span>
                            <span className="text-muted-foreground text-[11px]">peças</span>
                          </div>
                          <div className="bg-muted rounded-full h-2 mt-2 overflow-hidden">
                            <div
                              className={cn('h-2 transition-all', c.bar)}
                              style={{ width: `${Math.min(100, it.pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {!data.ausente && data.itens.length === 0 && (
              <Card>
                <CardContent className="text-center text-sm text-muted-foreground py-6">
                  Você ainda não tem operações alocadas para hoje.
                </CardContent>
              </Card>
            )}

            <Button
              size="lg"
              onClick={() => navigate('/meu/semana')}
              className="w-full bg-teal-600 text-white hover:bg-teal-700"
            >
              Ver minha semana
            </Button>

            <Button variant="outline" size="lg" onClick={load} className="w-full">
              Atualizar
            </Button>

            <Button
              variant="link"
              onClick={() => navigate('/meu/pin')}
              className="w-full text-teal-700 hover:text-teal-900"
            >
              Trocar meu PIN
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
