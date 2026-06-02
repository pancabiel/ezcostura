import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuthStore } from '../../stores/portalAuthStore';
import { portalAuth } from './portalApi';

/** Formata progressivamente como 000.000.000-00 a partir dos dígitos digitados. */
function formatCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9, 11)];
  let out = parts[0];
  if (parts[1]) out += '.' + parts[1];
  if (parts[2]) out += '.' + parts[2];
  if (parts[3]) out += '-' + parts[3];
  return out;
}

export default function PortalLoginPage() {
  const navigate = useNavigate();
  const setSession = usePortalAuthStore((s) => s.setSession);
  const [tenantId, setTenantId] = useState('');
  const [cpf, setCpf] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const data = await portalAuth.login(tenantId.trim(), cpf, pin);
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        operarioId: data.operarioId,
        nome: data.nome,
        tenantId: data.tenantId,
      });
      navigate('/meu', { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 423) {
        setErro('Acesso bloqueado por tentativas erradas. Tente novamente em alguns minutos.');
      } else if (status === 401) {
        setErro('CPF ou PIN inválidos.');
      } else {
        setErro('Não foi possível entrar. Verifique sua conexão.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4"
        >
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900">Meu Progresso</h1>
            <p className="text-sm text-slate-500 mt-1">Entre com seu CPF e PIN</p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Facção</span>
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="nome da facção"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">CPF</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="username"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">PIN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="****"
              maxLength={6}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </label>

          {erro && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-md transition"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="text-[11px] text-slate-500 text-center pt-2">
            Primeiro acesso? Seu PIN são os 4 primeiros números do seu CPF.
          </p>
        </form>
      </div>
    </div>
  );
}
