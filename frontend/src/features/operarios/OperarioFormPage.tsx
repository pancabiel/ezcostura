import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '../../db/dexie';
import { operariosRepo } from './operariosRepo';
import { formatCpf, formatTelefone } from './format';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormState {
  nome: string;
  cpf: string;
  telefone: string;
  dataAdmissao: string;
  ativo: boolean;
  jornadaId: string;
}

const empty: FormState = {
  nome: '',
  cpf: '',
  telefone: '',
  dataAdmissao: new Date().toISOString().slice(0, 10),
  ativo: true,
  jornadaId: '',
};

export default function OperarioFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const jornadas = useLiveQuery(
    async () => (await getDb().jornadas.toArray()).filter((j) => !j.pendingDelete).sort((a, b) => a.nome.localeCompare(b.nome)),
    [],
  ) ?? [];

  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const o = await operariosRepo.get(id);
      if (cancelled) return;
      if (!o) {
        setError('Funcionário não encontrado.');
        setLoading(false);
        return;
      }
      setForm({
        nome: o.nome,
        cpf: formatCpf(o.cpf ?? ''),
        telefone: formatTelefone(o.telefone ?? ''),
        dataAdmissao: o.dataAdmissao,
        ativo: o.ativo,
        jornadaId: o.jornadaId,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Default to first available jornada when creating.
  useEffect(() => {
    if (isEdit) return;
    if (!form.jornadaId && jornadas.length > 0) {
      setForm((p) => ({ ...p, jornadaId: jornadas[0].id }));
    }
  }, [isEdit, form.jornadaId, jornadas]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      setError('Nome é obrigatório.');
      return;
    }
    if (!form.jornadaId) {
      setError('Selecione uma jornada de trabalho.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nome: form.nome.trim(),
        cpf: form.cpf.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        dataAdmissao: form.dataAdmissao,
        ativo: form.ativo,
        jornadaId: form.jornadaId,
      };
      if (isEdit && id) await operariosRepo.update(id, payload);
      else await operariosRepo.create(payload);
      navigate('/operarios');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <form onSubmit={submit} className="max-w-xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{isEdit ? 'Editar funcionário' : 'Novo funcionário'}</h2>
        <Button type="button" variant="link" onClick={() => navigate('/operarios')}>
          Cancelar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="nome">Nome</FieldLabel>
              <Input id="nome" autoFocus value={form.nome} onChange={(e) => update('nome', e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cpf">CPF</FieldLabel>
              <Input
                id="cpf"
                value={form.cpf}
                onChange={(e) => update('cpf', formatCpf(e.target.value))}
                inputMode="numeric"
                placeholder="000.000.000-00"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="telefone">Telefone</FieldLabel>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(e) => update('telefone', formatTelefone(e.target.value))}
                inputMode="tel"
                placeholder="(00) 00000-0000"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="dataAdmissao">Data de admissão</FieldLabel>
              <Input
                id="dataAdmissao"
                type="date"
                value={form.dataAdmissao}
                onChange={(e) => update('dataAdmissao', e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="jornadaId">Jornada de trabalho</FieldLabel>
              <Select value={form.jornadaId} onValueChange={(v) => update('jornadaId', v)}>
                <SelectTrigger id="jornadaId" aria-label="Jornada de trabalho" className="w-full">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {jornadas.map((j) => (
                      <SelectItem key={j.id} value={j.id}>{j.nome}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {jornadas.length === 0 && (
                <FieldDescription className="text-destructive">
                  Cadastre uma jornada antes em Configurações &gt; Jornada.
                </FieldDescription>
              )}
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="ativo"
                checked={form.ativo}
                onCheckedChange={(v) => update('ativo', v === true)}
              />
              <FieldLabel htmlFor="ativo" className="font-normal">Ativo</FieldLabel>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" size="lg" onClick={() => navigate('/operarios')}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar funcionário'}
        </Button>
      </div>
    </form>
  );
}
