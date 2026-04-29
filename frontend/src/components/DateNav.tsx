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
    <div className="space-y-3">
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md p-3">
        <button onClick={() => onChange(shift(value, -1))} className="px-3 py-2 rounded-md hover:bg-slate-100">
          ← Dia anterior
        </button>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="px-3 py-2 rounded-md border border-slate-300 bg-white"
        />
        <span className="px-2 text-slate-700 capitalize hidden md:inline">{formatHuman(value)}</span>
        <button onClick={() => onChange(shift(value, 1))} className="ml-auto px-3 py-2 rounded-md hover:bg-slate-100">
          Próximo dia →
        </button>
      </div>
      {showTodayBanner && !isToday && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-300 text-amber-900 rounded-md px-4 py-3">
          <span className="text-sm">Você está visualizando outro dia ({formatHuman(value)}).</span>
          <button
            onClick={() => onChange(today())}
            className="ml-3 bg-amber-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-amber-600"
          >
            Voltar para hoje
          </button>
        </div>
      )}
    </div>
  );
}
