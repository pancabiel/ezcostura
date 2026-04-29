import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  username: string;
  tenantId: string;
  role: 'ADMIN' | 'OPERADOR';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [tenantId, setTenantId] = useState('local');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post<LoginResponse>('/api/auth/login', {
        tenantId, username, password,
      });
      setSession(data);
      navigate('/');
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Falha no login'
        : err instanceof Error
        ? err.message
        : 'Erro inesperado';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-lg shadow-sm w-full max-w-sm p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">ezcostura</h1>
          <p className="text-sm text-slate-500">Acesse sua facção</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <Field label="Facção (tenant)">
          <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="input" required />
        </Field>
        <Field label="Usuário">
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="input" required />
        </Field>
        <Field label="Senha">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white py-3 rounded-md font-medium disabled:opacity-50 hover:bg-slate-800"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="text-xs text-slate-500 text-center">
          Padrão da migração: usuário <code>admin</code> / senha <code>admin</code> — troque-a depois.
        </p>

        <style>{`.input { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid rgb(203 213 225); border-radius: 0.375rem; background: white; }`}</style>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
