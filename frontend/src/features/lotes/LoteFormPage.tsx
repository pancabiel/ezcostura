import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { lotesRepo } from './lotesRepo';
import type { Operacao, Tamanho } from '../../types/lote';

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
  children,
}: {
  title: string;
  onAdd: () => void;
  empty?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md"
        >
          + Adicionar
        </button>
      </div>
      {empty ? <p className="text-sm text-slate-500">{empty}</p> : children}
    </div>
  );
}
