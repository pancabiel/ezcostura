import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { toast } from 'sonner';
import { lotesRepo } from './lotesRepo';
import type { LoteLocal, Operacao, Tamanho, TamanhoTonalidade, Tonalidade } from '../../types/lote';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  temTonalidades: boolean;
  /** Nomes de tonalidade compartilhados (colunas da matriz), index-alinhados às células. */
  tonalidades: Tonalidade[];
}

const empty: FormState = {
  codigo: '',
  nome: '',
  descricao: '',
  operacoes: [],
  tamanhos: [],
  temTonalidades: false,
  tonalidades: [],
};

/** Soma das células de um tamanho (= total quando o lote tem tonalidades). */
const sumCells = (t: Tamanho): number =>
  t.tonalidades.reduce((s, c) => s + (c.quantidade || 0), 0);

/** Realinha as células de um tamanho à lista de nomes, preservando quantidades e preenchendo faltantes com 0. */
function alignCells(cells: TamanhoTonalidade[], nomes: Tonalidade[]): TamanhoTonalidade[] {
  return nomes.map((n) => {
    const existing = cells.find((c) => c.tonalidade === n.tonalidade);
    return existing ?? { id: uuid(), tonalidade: n.tonalidade, quantidade: 0 };
  });
}

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
      const tonalidades = lote.tonalidades ?? [];
      const tamanhos = (lote.tamanhos ?? []).map((t) => ({
        ...t,
        tonalidades: lote.temTonalidades ? alignCells(t.tonalidades ?? [], tonalidades) : (t.tonalidades ?? []),
      }));
      setForm({
        codigo: lote.codigo,
        nome: lote.nome,
        descricao: lote.descricao ?? '',
        operacoes: lote.operacoes,
        tamanhos,
        temTonalidades: lote.temTonalidades ?? false,
        tonalidades,
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

  // ── Tamanhos ──────────────────────────────────────────────────────────────
  const addTamanho = () =>
    setForm((prev) => {
      const cells = prev.temTonalidades
        ? prev.tonalidades.map((n) => ({ id: uuid(), tonalidade: n.tonalidade, quantidade: 0 }))
        : [];
      return {
        ...prev,
        tamanhos: [...prev.tamanhos, { id: uuid(), tamanho: '', quantidade: 0, tonalidades: cells }],
      };
    });
  const updateTamanho = (idx: number, patch: Partial<Tamanho>) =>
    update(
      'tamanhos',
      form.tamanhos.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    );
  const removeTamanho = (idx: number) =>
    update('tamanhos', form.tamanhos.filter((_, i) => i !== idx));

  /** Atualiza a quantidade de uma célula (tamanho × tonalidade). */
  const updateCelula = (tamIdx: number, tonIdx: number, quantidade: number) =>
    update(
      'tamanhos',
      form.tamanhos.map((t, ti) =>
        ti !== tamIdx
          ? t
          : { ...t, tonalidades: t.tonalidades.map((c, ci) => (ci === tonIdx ? { ...c, quantidade } : c)) },
      ),
    );

  // ── Tonalidades (nomes compartilhados) ──────────────────────────────────────
  const addTonalidade = () =>
    setForm((prev) => ({
      ...prev,
      tonalidades: [...prev.tonalidades, { id: uuid(), tonalidade: '' }],
      tamanhos: prev.tamanhos.map((t) => ({
        ...t,
        tonalidades: [...t.tonalidades, { id: uuid(), tonalidade: '', quantidade: 0 }],
      })),
    }));
  const updateTonalidadeNome = (idx: number, nome: string) =>
    setForm((prev) => ({
      ...prev,
      tonalidades: prev.tonalidades.map((t, i) => (i === idx ? { ...t, tonalidade: nome } : t)),
      tamanhos: prev.tamanhos.map((t) => ({
        ...t,
        tonalidades: t.tonalidades.map((c, i) => (i === idx ? { ...c, tonalidade: nome } : c)),
      })),
    }));
  const removeTonalidade = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      tonalidades: prev.tonalidades.filter((_, i) => i !== idx),
      tamanhos: prev.tamanhos.map((t) => ({
        ...t,
        tonalidades: t.tonalidades.filter((_, i) => i !== idx),
      })),
    }));

  /** Liga/desliga o trabalho com tonalidades no lote. */
  const setTemTonalidades = (on: boolean) =>
    setForm((prev) => {
      if (on) {
        if (prev.tonalidades.length > 0) {
          // Cores já guardadas (alternou de novo): realinha as células às colunas.
          return {
            ...prev,
            temTonalidades: true,
            tamanhos: prev.tamanhos.map((t) => ({ ...t, tonalidades: alignCells(t.tonalidades, prev.tonalidades) })),
          };
        }
        if (prev.tamanhos.length > 0) {
          // Já há tamanhos com total: cria "Sem tonalidade" herdando o total de cada um.
          const nome = 'Sem tonalidade';
          return {
            ...prev,
            temTonalidades: true,
            tonalidades: [{ id: uuid(), tonalidade: nome }],
            tamanhos: prev.tamanhos.map((t) => ({
              ...t,
              tonalidades: [{ id: uuid(), tonalidade: nome, quantidade: t.quantidade }],
            })),
          };
        }
        // Sem tamanhos e sem cores: só liga; o usuário adiciona as cores.
        return { ...prev, temTonalidades: true };
      }
      // Desligou: total do tamanho passa a ser a soma; guarda nomes/células escondidos.
      return {
        ...prev,
        temTonalidades: false,
        tamanhos: prev.tamanhos.map((t) => ({ ...t, quantidade: sumCells(t) })),
      };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.codigo.trim() || !form.nome.trim()) {
      toast.error('Código e nome são obrigatórios.');
      return;
    }
    if (form.operacoes.some((o) => !o.nome.trim() || o.metaPorHora <= 0)) {
      toast.error('Toda operação precisa de nome e meta por hora > 0.');
      return;
    }
    if (form.tamanhos.some((t) => !t.tamanho.trim())) {
      toast.error('Todo tamanho precisa de um rótulo.');
      return;
    }
    if (!form.temTonalidades && form.tamanhos.some((t) => t.quantidade < 0)) {
      toast.error('Todo tamanho precisa de quantidade ≥ 0.');
      return;
    }
    if (form.temTonalidades) {
      if (form.tonalidades.length === 0) {
        toast.error('Adicione ao menos uma tonalidade ou desligue "Trabalha com tonalidades".');
        return;
      }
      if (form.tonalidades.some((t) => !t.tonalidade.trim())) {
        toast.error('Toda tonalidade precisa de um nome.');
        return;
      }
      const nomes = form.tonalidades.map((t) => t.tonalidade.trim().toLowerCase());
      if (new Set(nomes).size !== nomes.length) {
        toast.error('Tonalidades não podem ter nomes repetidos.');
        return;
      }
    }

    setSaving(true);
    try {
      // Sem tonalidades, não persistimos a matriz: descartamos os nomes/células
      // (que podem estar em branco) para não disparar a validação @NotBlank no backend.
      const tamanhos = form.tamanhos.map((t) =>
        form.temTonalidades ? { ...t, quantidade: sumCells(t) } : { ...t, tonalidades: [] },
      );
      const payload = {
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || undefined,
        temTonalidades: form.temTonalidades,
        operacoes: form.operacoes,
        tamanhos,
        tonalidades: form.temTonalidades ? form.tonalidades : [],
      };
      if (isEdit && id) await lotesRepo.update(id, payload);
      else await lotesRepo.create(payload);
      navigate('/lotes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
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
                    value={op.metaPorHora || ''}
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

      <Card role="region" aria-labelledby="sec-tonalidades">
        <CardHeader>
          <CardTitle id="sec-tonalidades">Tonalidades</CardTitle>
          <CardAction className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Trabalha com tonalidades</span>
            <Switch
              aria-label="Trabalha com tonalidades"
              checked={form.temTonalidades}
              onCheckedChange={setTemTonalidades}
            />
          </CardAction>
        </CardHeader>
        {form.temTonalidades && (
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              As cores valem para todos os tamanhos. A quantidade de cada cor é informada por tamanho abaixo.
            </p>
            {form.tonalidades.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tonalidade adicionada.</p>
            ) : (
              form.tonalidades.map((t, idx) => (
                <div key={t.id} className="flex gap-3 items-end">
                  <Field className="flex-1">
                    <FieldLabel htmlFor={`ton-nome-${t.id}`}>Tonalidade</FieldLabel>
                    <Input
                      id={`ton-nome-${t.id}`}
                      value={t.tonalidade}
                      onChange={(e) => updateTonalidadeNome(idx, e.target.value)}
                      placeholder="Azul"
                      maxLength={32}
                    />
                  </Field>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeTonalidade(idx)}>
                    Remover
                  </Button>
                </div>
              ))
            )}
            <div>
              <Button type="button" variant="secondary" size="sm" onClick={addTonalidade}>
                + Adicionar tonalidade
              </Button>
            </div>
          </CardContent>
        )}
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
          ) : form.temTonalidades ? (
            form.tamanhos.map((t, idx) => (
              <div key={t.id} className="rounded-lg border p-3 flex flex-col gap-3">
                <div className="flex gap-3 items-end">
                  <Field className="w-32">
                    <FieldLabel htmlFor={`tam-rotulo-${t.id}`}>Tamanho</FieldLabel>
                    <Input
                      id={`tam-rotulo-${t.id}`}
                      value={t.tamanho}
                      onChange={(e) => updateTamanho(idx, { tamanho: e.target.value })}
                      placeholder="P"
                    />
                  </Field>
                  <div className="flex-1 text-sm text-muted-foreground">
                    Total: <span className="font-mono font-semibold text-foreground">{sumCells(t)}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeTamanho(idx)}>
                    Remover
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {t.tonalidades.map((c, ci) => (
                    <Field key={c.id} className="w-28">
                      <FieldLabel htmlFor={`cel-${t.id}-${c.id}`}>
                        {form.tonalidades[ci]?.tonalidade?.trim() || `Cor ${ci + 1}`}
                      </FieldLabel>
                      <Input
                        id={`cel-${t.id}-${c.id}`}
                        aria-label={form.tonalidades[ci]?.tonalidade?.trim() || `Cor ${ci + 1}`}
                        type="number"
                        min={0}
                        value={c.quantidade || ''}
                        onChange={(e) => updateCelula(idx, ci, Math.max(0, Number(e.target.value) || 0))}
                      />
                    </Field>
                  ))}
                </div>
              </div>
            ))
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
                    value={t.quantidade || ''}
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
