import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '../../db/dexie';
import { operariosRepo } from './operariosRepo';
import { operariosApi } from './operariosApi';
import { formatCpf } from './format';
import type { OperarioLocal } from '../../types/operario';
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
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Filtro = 'todos' | 'ativos' | 'inativos';

const onlyDigits = (s: string) => s.replace(/\D/g, '').slice(0, 6);

export default function OperariosListPage() {
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('ativos');
  const [pinModalFor, setPinModalFor] = useState<OperarioLocal | null>(null);
  const [confirmRemoveFor, setConfirmRemoveFor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const operarios = useLiveQuery(async () => {
    const all = await getDb().operarios.toArray();
    return all.filter((o) => !o.pendingDelete).sort((a, b) => a.nome.localeCompare(b.nome));
  }, []);

  const filtered = useMemo(() => {
    if (!operarios) return undefined;
    const q = query.trim().toLowerCase();
    return operarios.filter((o) => {
      if (filtro === 'ativos' && !o.ativo) return false;
      if (filtro === 'inativos' && o.ativo) return false;
      if (q && !o.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [operarios, query, filtro]);

  const toggleAtivo = async (o: OperarioLocal) => {
    await operariosRepo.update(o.id, { ativo: !o.ativo });
  };

  const removerAcesso = async (o: OperarioLocal) => {
    if (!o.serverId) return;
    setBusyId(o.id);
    try {
      await operariosApi.removePin(o.serverId);
      await operariosRepo.setTemPin(o.id, false);
      setConfirmRemoveFor(null);
    } catch {
      // silencioso: o estado não muda; o admin pode tentar de novo
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Funcionários</h2>
        <Button asChild>
          <Link to="/operarios/novo">+ Novo funcionário</Link>
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome…"
          className="flex-1"
        />
        <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <SelectTrigger aria-label="Filtro">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="ativos">Ativos</SelectItem>
              <SelectItem value="inativos">Inativos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {filtered === undefined ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <Empty className="border">
          <EmptyTitle>Nenhum funcionário encontrado.</EmptyTitle>
          <EmptyDescription>Ajuste o filtro ou cadastre um novo funcionário.</EmptyDescription>
        </Empty>
      ) : (
        <ul className="rounded-md border bg-card divide-y">
          {filtered.map((o) => (
            <li key={o.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <Link to={`/operarios/${o.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{o.nome}</span>
                    {!o.ativo && <Badge variant="secondary">inativo</Badge>}
                    {o.temPin ? (
                      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                        portal ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">sem portal</Badge>
                    )}
                  </div>
                  {(o.cpf || o.telefone) && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {[o.cpf && formatCpf(o.cpf), o.telefone].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </Link>
                <Button variant="ghost" size="sm" className="shrink-0" onClick={() => toggleAtivo(o)}>
                  {o.ativo ? 'Desativar' : 'Ativar'}
                </Button>
              </div>

              {/* Ações de acesso ao portal — só para operários já sincronizados. */}
              {o.serverId && (
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPinModalFor(o)}
                    disabled={busyId === o.id}
                  >
                    {o.temPin ? 'Resetar PIN' : 'Definir PIN'}
                  </Button>
                  {o.temPin && confirmRemoveFor !== o.id && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmRemoveFor(o.id)}
                      disabled={busyId === o.id}
                    >
                      Remover acesso
                    </Button>
                  )}
                  {o.temPin && confirmRemoveFor === o.id && (
                    <span className="flex items-center gap-2 text-xs">
                      <span className="text-destructive">Remover o acesso de {o.nome}?</span>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => removerAcesso(o)}
                        disabled={busyId === o.id}
                      >
                        {busyId === o.id ? 'Removendo…' : 'Confirmar'}
                      </Button>
                      <Button variant="outline" size="xs" onClick={() => setConfirmRemoveFor(null)}>
                        Cancelar
                      </Button>
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ResetPinModal
        operario={pinModalFor}
        onClose={() => setPinModalFor(null)}
        onDone={async () => {
          if (!pinModalFor) return;
          await operariosRepo.setTemPin(pinModalFor.id, true);
          setPinModalFor(null);
        }}
      />
    </div>
  );
}

function ResetPinModal({
  operario,
  onClose,
  onDone,
}: {
  operario: OperarioLocal | null;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!operario) return;
    if (!/^\d{4,6}$/.test(pin)) {
      setErro('O PIN deve ter de 4 a 6 dígitos.');
      return;
    }
    if (!operario.serverId) {
      setErro('Funcionário ainda não sincronizado com o servidor.');
      return;
    }
    setSaving(true);
    try {
      await operariosApi.setPin(operario.serverId, pin);
      await onDone();
    } catch {
      setErro('Não foi possível definir o PIN. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!operario}
      onOpenChange={(open) => {
        if (!open) {
          setPin('');
          setErro(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{operario?.temPin ? 'Resetar PIN' : 'Definir PIN'}</DialogTitle>
            <DialogDescription>
              Portal de {operario?.nome}. O funcionário poderá trocar depois.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="novo-pin">Novo PIN (4 a 6 dígitos)</FieldLabel>
            <Input
              id="novo-pin"
              type="text"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(onlyDigits(e.target.value))}
              placeholder="****"
              maxLength={6}
              className="tracking-widest"
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
              {saving ? 'Salvando…' : 'Salvar PIN'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
