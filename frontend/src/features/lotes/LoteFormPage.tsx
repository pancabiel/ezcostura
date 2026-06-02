import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { lotesRepo } from './lotesRepo';
import type { LoteLocal, Operacao, Tamanho } from '../../types/lote';

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
      if (isEdit && id) {
        await lotesRepo.update(id, {
          codigo: form.codigo.trim(),
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || undefined,
          operacoes: form.operacoes,
          tamanhos: form.tamanhos,
        });
      } else {
        await lotesRepo.create({
          codigo: form.codigo.trim(),
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || undefined,
          operacoes: form.operacoes,
          tamanhos: form.tamanhos,
        });
      }
      navigate('/lotes');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Carregando…</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          {isEdit ? 'Editar lote' : 'Novo lote'}
        </h2>
        <button
          type="button"
          onClick={() => navigate('/lotes')}
          className="text-sm text-slate-600 hover:underline"
        >
          Cancelar
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
        <Field label="Código">
          <input
            autoFocus
            value={form.codigo}
            onChange={(e) => update('codigo', e.target.value)}
            className="input"
            placeholder="L2024-001"
          />
        </Field>
        <Field label="Nome">
          <input
            value={form.nome}
            onChange={(e) => update('nome', e.target.value)}
            className="input"
            placeholder="Camiseta básica branca"
          />
        </Field>
        <Field label="Descrição">
          <textarea
            value={form.descricao}
            onChange={(e) => update('descricao', e.target.value)}
            className="input"
            rows={2}
          />
        </Field>
      </div>

      <Section
        title="Operações"
        onAdd={addOperacao}
        empty={form.operacoes.length === 0 ? 'Nenhuma operação adicionada.' : undefined}
        extraAction={
          <button
            type="button"
            onClick={openCopy}
            className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md"
          >
            Copiar
          </button>
        }
      >
        {form.operacoes.map((op, idx) => (
          <div key={op.id} className="flex gap-3 items-end">
            <Field label="Nome" className="flex-1">
              <input
                value={op.nome}
                onChange={(e) => updateOperacao(idx, { nome: e.target.value })}
                className="input"
                placeholder="Fechar lateral"
              />
            </Field>
            <Field label="Meta / hora" className="w-36">
              <input
                type="number"
                min={1}
                value={op.metaPorHora}
                onChange={(e) =>
                  updateOperacao(idx, { metaPorHora: Number(e.target.value) || 0 })
                }
                className="input"
              />
            </Field>
            <button
              type="button"
              onClick={() => removeOperacao(idx)}
              className="text-rose-600 text-sm pb-2"
            >
              Remover
            </button>
          </div>
        ))}
      </Section>

      <Section
        title="Tamanhos"
        onAdd={addTamanho}
        empty={form.tamanhos.length === 0 ? 'Nenhum tamanho adicionado.' : undefined}
      >
        {form.tamanhos.map((t, idx) => (
          <div key={t.id} className="flex gap-3 items-end">
            <Field label="Tamanho" className="w-32">
              <input
                value={t.tamanho}
                onChange={(e) => updateTamanho(idx, { tamanho: e.target.value })}
                className="input"
                placeholder="P"
              />
            </Field>
            <Field label="Quantidade" className="flex-1">
              <input
                type="number"
                min={0}
                value={t.quantidade}
                onChange={(e) =>
                  updateTamanho(idx, { quantidade: Number(e.target.value) || 0 })
                }
                className="input"
              />
            </Field>
            <button
              type="button"
              onClick={() => removeTamanho(idx)}
              className="text-rose-600 text-sm pb-2"
            >
              Remover
            </button>
          </div>
        ))}
      </Section>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => navigate('/lotes')}
          className="px-4 py-2 rounded-md border border-slate-300 bg-white"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-md bg-slate-900 text-white disabled:opacity-50"
        >
          {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar lote'}
        </button>
      </div>

      {copyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setCopyOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold">Copiar operações de outro lote</h3>
              <button type="button" onClick={() => setCopyOpen(false)} className="text-slate-500 hover:text-slate-700">×</button>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Selecione o lote de origem. As operações serão acrescentadas (sem substituir as atuais).
            </p>
            {allLotes.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Nenhum outro lote com operações cadastradas.</p>
            ) : (
              <ul className="space-y-2">
                {allLotes.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => copyOperacoesFrom(l.id)}
                      className="w-full text-left border border-slate-200 rounded-md p-3 hover:border-slate-400"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{l.codigo}</span>
                        <span className="text-xs text-slate-500">{l.operacoes.length} operação(ões)</span>
                      </div>
                      <p className="text-sm text-slate-600 truncate">{l.nome}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {l.operacoes.map((o) => o.nome).join(', ')}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => setCopyOpen(false)} className="px-3 py-2 rounded-md border border-slate-300 bg-white text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid rgb(203 213 225); border-radius: 0.375rem; background: white; }`}</style>
    </form>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Section({
  title,
  onAdd,
  empty,
  extraAction,
  children,
}: {
  title: string;
  onAdd: () => void;
  empty?: string;
  extraAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          {extraAction}
          <button
            type="button"
            onClick={onAdd}
            className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md"
          >
            + Adicionar
          </button>
        </div>
      </div>
      {empty ? <p className="text-sm text-slate-500">{empty}</p> : children}
    </div>
  );
}
