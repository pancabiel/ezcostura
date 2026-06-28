import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { lotesRepo } from './lotesRepo';
import type { LoteLocal, Operacao, Tamanho } from '../../types/lote';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';

interface FormState {
  codigo: string;
  nome: string;
  descricao: string;
  operacoes: Operacao[];
  tamanhos: Tamanho[];
}

const empty: FormState = {
  codigo: '',
  nome: '',
  descricao: '',
  operacoes: [],
  tamanhos: [],
};

export default function LoteFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [allLotes, setAllLotes] = useState<LoteLocal[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const lote = await lotesRepo.get(id);
      if (cancelled) return;
      if (!lote) {
        setError('Lote não encontrado.');
        setLoading(false);
        return;
      }
      setForm({
        codigo: lote.codigo,
        nome: lote.nome,
        descricao: lote.descricao ?? '',
        operacoes: lote.operacoes,
        tamanhos: lote.tamanhos,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCopy = async () => {
    const list = await lotesRepo.list();
    setAllLotes(list.filter((l) => l.id !== id && l.operacoes.length > 0));
    setCopyOpen(true);
  };

  const copyOperacoesFrom = (sourceId: string) => {
    const source = allLotes.find((l) => l.id === sourceId);
    if (!source) return;
    // Acrescenta (não substitui), criando novos ids para evitar conflito.
    const copied: Operacao[] = source.operacoes.map((o) => ({
      id: uuid(),
      nome: o.nome,
      metaPorHora: o.metaPorHora,
    }));
    update('operacoes', [...form.operacoes, ...copied]);
    setCopyOpen(false);
  };

  const addOperacao = () =>
    update('operacoes', [...form.operacoes, { id: uuid(), nome: '', metaPorHora: 60 }]);
  const updateOperacao = (idx: number, patch: Partial<Operacao>) =>
    update(
      'operacoes',
      form.operacoes.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    );
  const removeOperacao = (idx: number) =>
    update('operacoes', form.operacoes.filter((_, i) => i !== idx));

  const addTamanho = () =>
    update('tamanhos', [...form.tamanhos, { id: uuid(), tamanho: '', quantidade: 0 }]);
  const updateTamanho = (idx: number, patch: Partial<Tamanho>) =>
    update(
      'tamanhos',
      form.tamanhos.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    );
  const removeTamanho = (idx: number) =>
    update('tamanhos', form.tamanhos.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.codigo.trim() || !form.nome.trim()) {
      setError('Código e nome são obrigatórios.');
      return;
    }
    if (form.operacoes.some((o) => !o.nome.trim() || o.metaPorHora <= 0)) {
      setError('Toda operação precisa de nome e meta por hora > 0.');
      return;
    }
    if (form.tamanhos.some((t) => !t.tamanho.trim() || t.quantidade < 0)) {
      setError('Todo tamanho precisa de rótulo e quantidade ≥ 0.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || undefined,
        operacoes: form.operacoes,
        tamanhos: form.tamanhos,
      };
      if (isEdit && id) await lotesRepo.update(id, payload);
      else await lotesRepo.create(payload);
      navigate('/lotes');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{isEdit ? 'Editar lote' : 'Novo lote'}</h2>
        <Button type="button" variant="link" onClick={() => navigate('/lotes')}>
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
              <FieldLabel htmlFor="codigo">Código</FieldLabel>
              <Input
                id="codigo"
                autoFocus
                value={form.codigo}
                onChange={(e) => update('codigo', e.target.value)}
                placeholder="L2024-001"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="nome">Nome</FieldLabel>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => update('nome', e.target.value)}
                placeholder="Camiseta básica branca"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
              <Textarea
                id="descricao"
                value={form.descricao}
                onChange={(e) => update('descricao', e.target.value)}
                rows={2}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card role="region" aria-labelledby="sec-operacoes">
        <CardHeader>
          <CardTitle id="sec-operacoes">Operações</CardTitle>
          <CardAction className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={openCopy}>
              Copiar
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={addOperacao}>
              + Adicionar
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {form.operacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma operação adicionada.</p>
          ) : (
            form.operacoes.map((op, idx) => (
              <div key={op.id} className="flex gap-3 items-end">
                <Field className="flex-1">
                  <FieldLabel htmlFor={`op-nome-${op.id}`}>Nome</FieldLabel>
                  <Input
                    id={`op-nome-${op.id}`}
                    value={op.nome}
                    onChange={(e) => updateOperacao(idx, { nome: e.target.value })}
                    placeholder="Fechar lateral"
                  />
                </Field>
                <Field className="w-36">
                  <FieldLabel htmlFor={`op-meta-${op.id}`}>Meta / hora</FieldLabel>
                  <Input
                    id={`op-meta-${op.id}`}
                    type="number"
                    min={1}
                    value={op.metaPorHora}
                    onChange={(e) => updateOperacao(idx, { metaPorHora: Number(e.target.value) || 0 })}
                  />
                </Field>
                <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeOperacao(idx)}>
                  Remover
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card role="region" aria-labelledby="sec-tamanhos">
        <CardHeader>
          <CardTitle id="sec-tamanhos">Tamanhos</CardTitle>
          <CardAction>
            <Button type="button" variant="secondary" size="sm" onClick={addTamanho}>
              + Adicionar
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {form.tamanhos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum tamanho adicionado.</p>
          ) : (
            form.tamanhos.map((t, idx) => (
              <div key={t.id} className="flex gap-3 items-end">
                <Field className="w-32">
                  <FieldLabel htmlFor={`tam-rotulo-${t.id}`}>Tamanho</FieldLabel>
                  <Input
                    id={`tam-rotulo-${t.id}`}
                    value={t.tamanho}
                    onChange={(e) => updateTamanho(idx, { tamanho: e.target.value })}
                    placeholder="P"
                  />
                </Field>
                <Field className="flex-1">
                  <FieldLabel htmlFor={`tam-qtd-${t.id}`}>Quantidade</FieldLabel>
                  <Input
                    id={`tam-qtd-${t.id}`}
                    type="number"
                    min={0}
                    value={t.quantidade}
                    onChange={(e) => updateTamanho(idx, { quantidade: Number(e.target.value) || 0 })}
                  />
                </Field>
                <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeTamanho(idx)}>
                  Remover
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" size="lg" onClick={() => navigate('/lotes')}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar lote'}
        </Button>
      </div>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Copiar operações de outro lote</DialogTitle>
            <DialogDescription>
              Selecione o lote de origem. As operações serão acrescentadas (sem substituir as atuais).
            </DialogDescription>
          </DialogHeader>
          {allLotes.length === 0 ? (
            <Empty className="border">
              <EmptyTitle>Nenhum outro lote com operações.</EmptyTitle>
              <EmptyDescription>Cadastre operações em outro lote para poder copiá-las.</EmptyDescription>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {allLotes.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => copyOperacoesFrom(l.id)}
                    className="w-full text-left rounded-md border p-3 transition-colors hover:border-ring hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{l.codigo}</span>
                      <span className="text-xs text-muted-foreground">{l.operacoes.length} operação(ões)</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{l.nome}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {l.operacoes.map((o) => o.nome).join(', ')}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCopyOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
