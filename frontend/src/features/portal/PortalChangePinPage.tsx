import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { meApi } from './portalApi';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';

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
    <div className="min-h-screen bg-muted/40 flex flex-col">
      <header className="bg-teal-700 text-white px-4 py-4 shadow-sm">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/meu')}
            className="text-teal-100 hover:bg-teal-800 hover:text-white text-xl"
            aria-label="Voltar"
          >
            ‹
          </Button>
          <h1 className="text-lg font-bold">Trocar PIN</h1>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <Card className="w-full max-w-sm">
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="pin-atual">PIN atual</FieldLabel>
                  <Input
                    id="pin-atual"
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(onlyDigits(e.target.value))}
                    placeholder="****"
                    maxLength={6}
                    required
                    className="tracking-widest"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pin-novo">Novo PIN (4 a 6 dígitos)</FieldLabel>
                  <Input
                    id="pin-novo"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    value={newPin}
                    onChange={(e) => setNewPin(onlyDigits(e.target.value))}
                    placeholder="****"
                    maxLength={6}
                    required
                    className="tracking-widest"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pin-confirma">Confirmar novo PIN</FieldLabel>
                  <Input
                    id="pin-confirma"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(onlyDigits(e.target.value))}
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
              {ok && (
                <Alert className="border-emerald-200 text-emerald-800 dark:border-emerald-400/30 dark:text-emerald-300">
                  <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                    PIN alterado com sucesso!
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={loading || ok}
                className="w-full bg-teal-600 text-white hover:bg-teal-700"
              >
                {loading ? 'Salvando…' : 'Salvar novo PIN'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
