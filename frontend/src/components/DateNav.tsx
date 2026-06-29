import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  value: string; // ISO date YYYY-MM-DD
  onChange: (value: string) => void;
  showTodayBanner?: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

const shift = (iso: string, days: number): string => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const formatHuman = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

export default function DateNav({ value, onChange, showTodayBanner }: Props) {
  const isToday = value === today();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-md border bg-card p-3">
        <Button variant="ghost" size="icon" aria-label="Dia anterior" onClick={() => onChange(shift(value, -1))}>
          <ChevronLeft className="size-5" />
        </Button>
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-auto"
        />
        <span className="px-2 text-foreground capitalize hidden md:inline">{formatHuman(value)}</span>
        <Button variant="ghost" size="icon" aria-label="Próximo dia" className="ml-auto" onClick={() => onChange(shift(value, 1))}>
          <ChevronRight className="size-5" />
        </Button>
      </div>
      {showTodayBanner && !isToday && (
        <div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <span className="text-sm">Você está visualizando outro dia ({formatHuman(value)}).</span>
          <Button size="sm" className="ml-3 bg-amber-500 text-white hover:bg-amber-600" onClick={() => onChange(today())}>
            Voltar para hoje
          </Button>
        </div>
      )}
    </div>
  );
}
