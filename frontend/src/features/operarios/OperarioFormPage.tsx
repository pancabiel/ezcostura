import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { operariosRepo } from './operariosRepo';

interface FormState {
  nome: string;
  cpf: string;
  telefone: string;
  dataAdmissao: string;
  ativo: boolean;
}

const empty: FormState = {
  nome: '',
  cpf: '',
  telefone: '',
  dataAdmissao: new Date().toISOString().slice(0, 10),
  ativo: true,
};

export default function OperarioFormPage() {
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
      const o = await operariosRepo.get(id);
      if (cancelled) return;
      if (!o) {
        setError('Operário não encontrado.');
        setLoading(false);
        return;
      }
      setForm({
        nome: o.nome,
        cpf: o.cpf ?? '',
        telefone: o.telefone ?? '',
        dataAdmissao: o.dataAdmissao,
        ativo: o.ativo,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      setError('Nome é obrigatório.');
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

  if (loading) return <p className="text-slate-500">Carregando…</p>;

  return (
    <form onSubmit={submit} className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{isEdit ? 'Editar operário' : 'Novo operário'}</h2>
        <button type="button" onClick={() => navigate('/operarios')} className="text-sm text-slate-600 hover:underline">
          Cancelar
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-md">{error}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
        <Field label="Nome">
          <input value={form.nome} onChange={(e) => update('nome', e.target.value)} className="input" />
        </Field>
        <Field label="CPF">
          <input value={form.cpf} onChange={(e) => update('cpf', e.target.value)} className="input" />
        </Field>
        <Field label="Telefone">
          <input value={form.telefone} onChange={(e) => update('telefone', e.target.value)} className="input" />
        </Field>
        <Field label="Data de admissão">
          <input
            type="date"
            value={form.dataAdmissao}
            onChange={(e) => update('dataAdmissao', e.target.value)}
            className="input"
          />
        </Field>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => update('ativo', e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm">Ativo</span>
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => navigate('/operarios')} className="px-4 py-2 rounded-md border border-slate-300 bg-white">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-slate-900 text-white disabled:opacity-50">
          {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar operário'}
        </button>
      </div>

      <style>{`.input { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid rgb(203 213 225); border-radius: 0.375rem; background: white; }`}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
