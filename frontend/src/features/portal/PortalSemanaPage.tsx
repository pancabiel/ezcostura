import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuthStore } from '../../stores/portalAuthStore';
import { meApi, type DesempenhoPeriodo } from './portalApi';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

function pctColor(pct: number) {
  if (pct >= 100) return { bar: 'bg-emerald-500', badge: 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300' };
  if (pct >= 75) return { bar: 'bg-amber-500', badge: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300' };
  return { bar: 'bg-rose-500', badge: 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300' };
}

/** Últimos 7 dias incluindo hoje, em ISO (YYYY-MM-DD). */
function ultimos7Dias(): { inicio: string; fim: string } {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: iso(inicio), fim: iso(hoje) };
}

function diaSemanaCurto(iso: string): string {
  // iso = YYYY-MM-DD — interpretar como data local, sem fuso.
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

export default function PortalSemanaPage() {
  const navigate = useNavigate();
  const session = usePortalAuthStore((s) => s.session);
  const [data, setData] = useState<DesempenhoPeriodo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErro(null);
    try {
      const { inicio, fim } = ultimos7Dias();
      const d = await meApi.periodo(inicio, fim);
      setData(d);
    } catch {
      setErro('Não foi possível carregar sua semana.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const maxProduzido = data ? Math.max(1, ...data.dias.map((d) => d.totalProduzido)) : 1;
  const cor = pctColor(data?.totalPct ?? 0);

  return (
    <div className="min-h-screen bg-muted/40 pb-8">
      <header className="bg-teal-700 text-white px-4 pt-6 pb-8 shadow-sm">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/meu')}
            className="text-teal-100 hover:bg-teal-800 hover:text-white text-2xl"
            aria-label="Voltar"
          >
            ‹
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wider text-teal-100">Últimos 7 dias</p>
            <h1 className="text-xl font-bold leading-tight">{session?.nome ?? 'Minha semana'}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-5 flex flex-col gap-4">
        {loading && (
          <Card>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-40" />
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
            {/* Total do período */}
            <Card>
              <CardContent>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Total na semana</p>
                  <Badge className={cn(cor.badge)}>{data.totalPct}%</Badge>
                </div>
                <p className="text-4xl font-bold text-foreground mt-1">
                  {data.totalProduzido}
                  <span className="text-lg font-normal text-muted-foreground"> / {data.totalMeta} peças</span>
                </p>
              </CardContent>
            </Card>

            {/* Gráfico de barras — produção por dia */}
            <Card>
              <CardContent>
                <h2 className="font-semibold text-foreground text-sm mb-4">Produção por dia</h2>
                <div className="flex items-end justify-between gap-1.5 h-40">
                  {data.dias.map((d) => {
                    const c = pctColor(d.totalPct);
                    const altura = Math.round((d.totalProduzido / maxProduzido) * 100);
                    return (
                      <div key={d.data} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                        <span className="text-[11px] font-mono font-semibold text-foreground">
                          {d.totalProduzido}
                        </span>
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className={cn('w-full rounded-t transition-all', d.ausente ? 'bg-muted' : c.bar)}
                            style={{ height: `${d.ausente ? 4 : Math.max(4, altura)}%` }}
                            title={d.ausente ? 'Ausente' : `${d.totalProduzido}/${d.totalMeta}`}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground capitalize truncate w-full text-center">
                          {diaSemanaCurto(d.data)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 text-center">
                  Cor: <span className="text-rose-500">vermelho</span> abaixo de 75%,{' '}
                  <span className="text-amber-500">amarelo</span> até 99%,{' '}
                  <span className="text-emerald-600">verde</span> 100%+.
                </p>
              </CardContent>
            </Card>

            {/* Detalhe por dia */}
            <Card>
              <CardContent>
                <h2 className="font-semibold text-foreground text-sm mb-3">Resumo</h2>
                <div>
                  {[...data.dias].reverse().map((d, idx, arr) => {
                    const c = pctColor(d.totalPct);
                    return (
                      <div key={d.data}>
                        <div className="flex items-center justify-between gap-2 py-2">
                          <span className="text-sm text-foreground capitalize">
                            {diaSemanaCurto(d.data)}{' '}
                            <span className="text-muted-foreground text-xs">{d.data.slice(8, 10)}/{d.data.slice(5, 7)}</span>
                          </span>
                          {d.ausente ? (
                            <span className="text-xs text-muted-foreground">Ausente</span>
                          ) : (
                            <span className="text-sm flex items-center gap-1">
                              <span className="font-mono font-semibold text-foreground">{d.totalProduzido}</span>
                              <span className="text-muted-foreground"> / {d.totalMeta}</span>
                              <Badge className={cn('ml-1', c.badge)}>{d.totalPct}%</Badge>
                            </span>
                          )}
                        </div>
                        {idx < arr.length - 1 && <Separator />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Button variant="outline" size="lg" onClick={() => navigate('/meu')} className="w-full">
              Voltar ao início
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
