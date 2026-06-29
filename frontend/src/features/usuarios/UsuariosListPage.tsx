import { useCallback, useEffect, useState } from 'react';
import { usuariosApi } from './usuariosApi';
import { ROLE_LABEL, type RoleGerenciavel, type UsuarioWire } from '../../types/usuario';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Extrai a mensagem de erro vinda do backend (campo `message`), com fallback. */
function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return typeof msg === 'string' && msg ? msg : fallback;
}

export default function UsuariosListPage() {
  const [usuarios, setUsuarios] = useState<UsuarioWire[] | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UsuarioWire | null>(null);

  const reload = useCallback(async () => {
    try {
      setErro(null);
      setUsuarios(await usuariosApi.list());
    } catch (err) {
      setErro(errorMessage(err, 'Não foi possível carregar os usuários.'));
      setUsuarios([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggleAtivo = async (u: UsuarioWire) => {
    setBusyId(u.id);
    setErro(null);
    try {
      await usuariosApi.setAtivo(u.id, !u.ativo);
      await reload();
    } catch (err) {
      setErro(errorMessage(err, 'Não foi possível alterar o status.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Usuários</h2>
        <Button onClick={() => setNovoOpen(true)}>+ Novo usuário</Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Crie usuários <strong>Gerente</strong> (acesso total, exceto a esta tela) ou{' '}
        <strong>Supervisor</strong> (apenas facilitador e relatórios). A conta de administrador não
        pode ser alterada aqui.
      </p>

      {erro && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {usuarios === undefined ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : usuarios.length === 0 ? (
        <Empty className="border">
          <EmptyTitle>Nenhum usuário cadastrado.</EmptyTitle>
          <EmptyDescription>Crie o primeiro usuário Gerente ou Supervisor.</EmptyDescription>
        </Empty>
      ) : (
        <ul className="rounded-md border bg-card divide-y">
          {usuarios.map((u) => {
            const gerenciavel = u.role === 'GERENTE' || u.role === 'SUPERVISOR';
            return (
              <li key={u.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{u.username}</span>
                    <Badge variant="secondary">{ROLE_LABEL[u.role]}</Badge>
                    {!u.ativo && <Badge variant="secondary">inativo</Badge>}
                  </div>
                </div>
                {gerenciavel && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResetTarget(u)}
                      disabled={busyId === u.id}
                    >
                      Redefinir senha
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAtivo(u)}
                      disabled={busyId === u.id}
                    >
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <NovoUsuarioModal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        onCreated={async () => {
          setNovoOpen(false);
          await reload();
        }}
      />
      <ResetPasswordModal
        usuario={resetTarget}
        onClose={() => setResetTarget(null)}
        onDone={() => setResetTarget(null)}
      />
    </div>
  );
}

function NovoUsuarioModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<RoleGerenciavel>('GERENTE');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const reset = () => {
    setUsername('');
    setRole('GERENTE');
    setPassword('');
    setErro(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!username.trim()) {
      setErro('Usuário é obrigatório.');
      return;
    }
    if (password.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await usuariosApi.create({ username: username.trim(), role, password });
      reset();
      await onCreated();
    } catch (err) {
      setErro(errorMessage(err, 'Não foi possível criar o usuário.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>O usuário entra com a facção, este nome e a senha.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="novo-username">Usuário</FieldLabel>
            <Input
              id="novo-username"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex.: maria.gerente"
              maxLength={64}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="novo-role">Tipo</FieldLabel>
            <Select value={role} onValueChange={(v) => setRole(v as RoleGerenciavel)}>
              <SelectTrigger id="novo-role" aria-label="Tipo de usuário" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="GERENTE">Gerente — acesso total, exceto usuários</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor — facilitador e relatórios</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="novo-password">Senha</FieldLabel>
            <Input
              id="novo-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 8 caracteres"
            />
            <FieldDescription>O usuário pode trocar depois em Senha.</FieldDescription>
          </Field>
          {erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Criando…' : 'Criar usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordModal({
  usuario,
  onClose,
  onDone,
}: {
  usuario: UsuarioWire | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!usuario) return;
    if (password.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await usuariosApi.resetPassword(usuario.id, password);
      setPassword('');
      onDone();
    } catch (err) {
      setErro(errorMessage(err, 'Não foi possível redefinir a senha.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!usuario}
      onOpenChange={(o) => {
        if (!o) {
          setPassword('');
          setErro(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>Nova senha para {usuario?.username}.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="reset-password">Nova senha</FieldLabel>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 8 caracteres"
            />
          </Field>
          {erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
