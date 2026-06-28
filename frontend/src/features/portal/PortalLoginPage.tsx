import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuthStore } from '../../stores/portalAuthStore';
import { portalAuth } from './portalApi';
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';

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
    <div className="min-h-screen bg-muted/40 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Meu Progresso</CardTitle>
            <CardDescription>Entre com seu CPF e PIN</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="portal-tenant">Facção</FieldLabel>
                  <Input
                    id="portal-tenant"
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    placeholder="nome da facção"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="portal-cpf">CPF</FieldLabel>
                  <Input
                    id="portal-cpf"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="username"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="portal-pin">PIN</FieldLabel>
                  <Input
                    id="portal-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="****"
                    maxLength={6}
                    required
                    className="tracking-widest"
                  />
                </Field>
              </FieldGroup>

              {erro && (
                <Alert variant="destructive">
                  <AlertDescription>{erro}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full bg-teal-600 text-white hover:bg-teal-700"
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </Button>

              <FieldDescription className="text-center">
                Primeiro acesso? Seu PIN são os 4 primeiros números do seu CPF.
              </FieldDescription>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
