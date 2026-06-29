import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore, type Role } from '../../stores/authStore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  username: string;
  tenantId: string;
  role: Role;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [tenantId, setTenantId] = useState(() => localStorage.getItem('lastTenantId') ?? '');
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
      localStorage.setItem('lastTenantId', tenantId);
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
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">ezcostura</CardTitle>
          <CardDescription>Acesse sua facção</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="tenantId">Facção (tenant)</FieldLabel>
                <Input id="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="username">Usuário</FieldLabel>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
            </FieldGroup>

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Padrão da migração: usuário <code>admin</code> / senha <code>admin</code> — troque-a depois.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
