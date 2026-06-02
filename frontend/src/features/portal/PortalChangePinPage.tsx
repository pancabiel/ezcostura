import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { meApi } from './portalApi';

const onlyDigits = (s: string) => s.replace(/\D/g, '').slice(0, 6);

export default function PortalChangePinPage() {
  const navigate = useNavigate();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (newPin.length < 4) {
      setErro('O novo PIN deve ter de 4 a 6 dígitos.');
      return;
    }
    if (newPin !== confirmPin) {
      setErro('A confirmação não corresponde ao novo PIN.');
      return;
    }
    setLoading(true);
    try {
      await meApi.changePin(currentPin, newPin);
      setOk(true);
      setTimeout(() => navigate('/meu', { replace: true }), 1200);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setErro('PIN atual incorreto.');
      } else if (status === 400) {
        setErro('O novo PIN deve ter de 4 a 6 dígitos.');
      } else {
        setErro('Não foi possível trocar o PIN. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-teal-700 text-white px-4 py-4 shadow-sm">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/meu')}
            className="text-teal-100 hover:text-white text-xl leading-none"
            aria-label="Voltar"
          >
            ‹
          </button>
          <h1 className="text-lg font-bold">Trocar PIN</h1>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">PIN atual</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={currentPin}
              onChange={(e) => setCurrentPin(onlyDigits(e.target.value))}
              placeholder="****"
              maxLength={6}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Novo PIN (4 a 6 dígitos)</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={newPin}
              onChange={(e) => setNewPin(onlyDigits(e.target.value))}
              placeholder="****"
              maxLength={6}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Confirmar novo PIN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(onlyDigits(e.target.value))}
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
          {ok && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              PIN alterado com sucesso!
            </p>
          )}

          <button
            type="submit"
            disabled={loading || ok}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-md transition"
          >
            {loading ? 'Salvando…' : 'Salvar novo PIN'}
          </button>
        </form>
      </div>
    </div>
  );
}
