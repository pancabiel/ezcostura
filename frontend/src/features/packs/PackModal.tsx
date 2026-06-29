import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { packsRepo } from './packsRepo';
import { alocacoesRepo } from '../alocacoes/alocacoesRepo';
import { selectableLotes } from '../lotes/lotesRepo';
import { resolverJornadaEfetiva } from '../jornada/jornadaRepo';
import { getSession } from '../../stores/authStore';
import { getDb } from '../../db/dexie';
import type { AlocacaoLocal } from '../../types/alocacao';
import type { LoteLocal } from '../../types/lote';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  operarioId: string;
  operarioNome: string;
  data: string;
  alocacoes: AlocacaoLocal[];
  lotes: LoteLocal[];
  onClose: () => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function PackModal({ operarioId, operarioNome, data, alocacoes, lotes, onClose }: Props) {
  const vigente = useMemo(() => alocacoesRepo.pickVigente(alocacoes, new Date()), [alocacoes]);

  // Pré-seleciona o lote/operação da alocação vigente, se houver.
  const [loteId, setLoteId] = useState<string>(vigente?.loteId ?? '');
  const [operacaoId, setOperacaoId] = useState<string>(vigente?.operacaoId ?? '');
  const [tamanho, setTamanho] = useState<string>('');
  const [tamanhoTouched, setTamanhoTouched] = useState(false);
  const [tonalidade, setTonalidade] = useState<string>('');
  const [tonalidadeTouched, setTonalidadeTouched] = useState(false);
  const [quantidade, setQuantidade] = useState<number>(0);
  const [quantidadeTouched, setQuantidadeTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [jaProduzido, setJaProduzido] = useState<number>(0);
  const [jaProduzidoTon, setJaProduzidoTon] = useState<number>(0);
  const session = getSession();

  const jornadas = useLiveQuery(() => getDb().jornadas.toArray(), []) ?? [];
  const diasEspeciais = useLiveQuery(() => getDb().diasEspeciais.toArray(), []) ?? [];
  const operario = useLiveQuery(() => getDb().operarios.get(operarioId), [operarioId]);

  const efetiva = useMemo(() => {
    if (!operario) return null;
    return resolverJornadaEfetiva({
      operarioId, data, jornadas, diasEspeciais, jornadaIdDoOperario: operario.jornadaId,
    });
  }, [operario, operarioId, data, jornadas, diasEspeciais]);

  const selectedLote = useMemo(() => lotes.find((l) => l.id === loteId), [lotes, loteId]);
  const temTonalidades = selectedLote?.temTonalidades ?? false;
  const tamanhoObj = useMemo(
    () => selectedLote?.tamanhos.find((t) => t.tamanho === tamanho),
    [selectedLote, tamanho],
  );
  // Cores oferecidas para o tamanho escolhido: só as que têm peças (> 0) naquele tamanho.
  const tonalidadesDoTamanho = useMemo(
    () => (tamanhoObj?.tonalidades ?? []).filter((c) => c.quantidade > 0),
    [tamanhoObj],
  );

  // Lotes oferecidos no select: só os ativos, do mais recente ao mais antigo.
  // Mantém o lote já selecionado visível mesmo se finalizado (pré-seleção da alocação vigente).
  const lotesSelecionaveis = useMemo(() => {
    const sel = selectableLotes(lotes);
    if (loteId && selectedLote && !sel.some((l) => l.id === loteId)) return [selectedLote, ...sel];
    return sel;
  }, [lotes, loteId, selectedLote]);

  // Para cada operação do lote selecionado, descobre se já há alocação para esse operário no dia.
  const operacoesComAloc = useMemo(() => {
    if (!selectedLote) return [];
    return selectedLote.operacoes.map((op) => {
      const aloc = alocacoes.find(
        (a) => !a.pendingDelete && a.loteId === selectedLote.id && a.operacaoId === op.id,
      );
      return { op, aloc };
    });
  }, [selectedLote, alocacoes]);

  // Limpa operacaoId se não pertence ao novo lote.
  useEffect(() => {
    if (!selectedLote) return;
    if (operacaoId && !selectedLote.operacoes.some((o) => o.id === operacaoId)) {
      setOperacaoId('');
    }
  }, [selectedLote, operacaoId]);

  // Auto-preenche tamanho com o último pack do lote+operação.
  useEffect(() => {
    if (!selectedLote || !operacaoId || tamanhoTouched) return;
    let cancelled = false;
    void (async () => {
      const allPacks = (await getDb().packs.toArray()).filter(
        (p) => !p.pendingDelete && p.loteId === selectedLote.id && p.operacaoId === operacaoId,
      );
      if (cancelled) return;
      if (allPacks.length === 0) { setTamanho(''); return; }
      allPacks.sort((a, b) => b.horario.localeCompare(a.horario));
      const lastTam = allPacks[0].tamanho;
      if (selectedLote.tamanhos.some((t) => t.tamanho === lastTam)) {
        setTamanho(lastTam);
      } else {
        setTamanho('');
      }
    })();
    return () => { cancelled = true; };
  }, [selectedLote, operacaoId, tamanhoTouched]);

  // Tonalidade depende do tamanho: limpa a seleção se a cor não existe (ou zerou) no tamanho.
  useEffect(() => {
    if (!temTonalidades) {
      if (tonalidade) setTonalidade('');
      return;
    }
    if (tonalidade && !tonalidadesDoTamanho.some((c) => c.tonalidade === tonalidade)) {
      setTonalidade('');
    }
  }, [temTonalidades, tonalidadesDoTamanho, tonalidade]);

  // Auto-preenche tonalidade com o último pack do lote+operação+tamanho (só cores disponíveis no tamanho).
  useEffect(() => {
    if (!selectedLote || !operacaoId || !tamanho || tonalidadeTouched || !temTonalidades) return;
    let cancelled = false;
    void (async () => {
      const allPacks = (await getDb().packs.toArray()).filter(
        (p) => !p.pendingDelete && p.loteId === selectedLote.id && p.operacaoId === operacaoId && p.tamanho === tamanho,
      );
      if (cancelled || allPacks.length === 0) return;
      allPacks.sort((a, b) => b.horario.localeCompare(a.horario));
      const lastTon = allPacks[0].tonalidade;
      if (lastTon && tonalidadesDoTamanho.some((c) => c.tonalidade === lastTon)) {
        setTonalidade(lastTon);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedLote, operacaoId, tamanho, tonalidadeTouched, temTonalidades, tonalidadesDoTamanho]);

  // Auto-preenche quantidade com o último pack do lote.
  useEffect(() => {
    if (!selectedLote || quantidadeTouched) return;
    let cancelled = false;
    void (async () => {
      const allPacks = (await getDb().packs.toArray()).filter(
        (p) => !p.pendingDelete && p.loteId === selectedLote.id,
      );
      if (cancelled) return;
      if (allPacks.length === 0) { setQuantidade(0); return; }
      allPacks.sort((a, b) => b.horario.localeCompare(a.horario));
      setQuantidade(allPacks[0].quantidade);
    })();
    return () => { cancelled = true; };
  }, [selectedLote, quantidadeTouched]);

  // Soma já produzida para o lote+operação+tamanho selecionado.
  useEffect(() => {
    if (!selectedLote || !operacaoId || !tamanho) { setJaProduzido(0); return; }
    let cancelled = false;
    void (async () => {
      const total = (await getDb().packs.toArray()).reduce((s, p) => {
        if (p.pendingDelete) return s;
        if (p.loteId !== selectedLote.id) return s;
        if (p.operacaoId !== operacaoId) return s;
        if (p.tamanho !== tamanho) return s;
        return s + p.quantidade;
      }, 0);
      if (!cancelled) setJaProduzido(total);
    })();
    return () => { cancelled = true; };
  }, [selectedLote, operacaoId, tamanho]);

  // Trava do tamanho: só quando o lote NÃO tem tonalidades (senão a trava é por célula).
  const limite = useMemo(() => {
    if (temTonalidades || !tamanhoObj) return null;
    return tamanhoObj.quantidade;
  }, [temTonalidades, tamanhoObj]);

  const restante = limite != null ? Math.max(0, limite - jaProduzido) : null;
  const ultrapassaria = limite != null && quantidade > 0 && jaProduzido + quantidade > limite;

  // Soma já produzida para a célula lote+operação+tamanho+tonalidade.
  useEffect(() => {
    if (!selectedLote || !operacaoId || !tamanho || !tonalidade) { setJaProduzidoTon(0); return; }
    let cancelled = false;
    void (async () => {
      const total = (await getDb().packs.toArray()).reduce((s, p) => {
        if (p.pendingDelete) return s;
        if (p.loteId !== selectedLote.id) return s;
        if (p.operacaoId !== operacaoId) return s;
        if (p.tamanho !== tamanho) return s;
        if (p.tonalidade !== tonalidade) return s;
        return s + p.quantidade;
      }, 0);
      if (!cancelled) setJaProduzidoTon(total);
    })();
    return () => { cancelled = true; };
  }, [selectedLote, operacaoId, tamanho, tonalidade]);

  // Trava da célula (tamanho × tonalidade), só quando o lote tem tonalidades.
  const limiteTon = useMemo(() => {
    if (!temTonalidades || !tonalidade || !tamanhoObj) return null;
    return tamanhoObj.tonalidades.find((c) => c.tonalidade === tonalidade)?.quantidade ?? null;
  }, [temTonalidades, tonalidade, tamanhoObj]);

  const restanteTon = limiteTon != null ? Math.max(0, limiteTon - jaProduzidoTon) : null;
  const ultrapassariaTon = limiteTon != null && quantidade > 0 && jaProduzidoTon + quantidade > limiteTon;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loteId || !operacaoId) {
      setError('Selecione o lote e a operação.');
      return;
    }
    if (!tamanho) {
      setError('Selecione um tamanho.');
      return;
    }
    if (temTonalidades && !tonalidade) {
      setError('Selecione uma tonalidade.');
      return;
    }
    if (!quantidade || quantidade <= 0) {
      setError('Quantidade deve ser maior que zero.');
      return;
    }
    if (ultrapassaria && limite != null) {
      setError(`Estouro do limite do lote: tamanho "${tamanho}" tem ${jaProduzido} de ${limite} peças produzidas. Resta(m) ${limite - jaProduzido}.`);
      return;
    }
    if (ultrapassariaTon && limiteTon != null) {
      setError(`Estouro do limite do lote: tonalidade "${tonalidade}" tem ${jaProduzidoTon} de ${limiteTon} peças produzidas. Resta(m) ${limiteTon - jaProduzidoTon}.`);
      return;
    }

    if (!selectedLote) {
      setError('Lote inválido.');
      return;
    }
    const operacao = selectedLote.operacoes.find((o) => o.id === operacaoId);
    if (!operacao) {
      setError('Operação inválida.');
      return;
    }

    setSaving(true);
    try {
      // Localiza alocação existente do operário+lote+operação no dia, ou cria.
      let alocId = alocacoes.find(
        (a) => !a.pendingDelete && a.loteId === loteId && a.operacaoId === operacaoId,
      )?.id;
      if (!alocId) {
        const horarioInicio = data === todayISO() ? nowHHMM() : (efetiva?.horaInicio ?? '07:00');
        const novo = await alocacoesRepo.create({
          operarioId, data, horarioInicio, loteId, operacaoId,
        });
        alocId = novo.id;
      }
      await packsRepo.create({
        operarioId, data,
        horario: new Date().toISOString(),
        alocacaoId: alocId,
        loteId,
        operacaoId,
        loteCodigo: selectedLote.codigo,
        operacaoNome: operacao.nome,
        quantidade,
        tamanho,
        tonalidade: temTonalidades ? tonalidade : undefined,
        registradoPor: session?.userId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[95vh] overflow-y-auto">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Adicionar pack</DialogTitle>
            <DialogDescription>{operarioNome}</DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="pack-lote">Lote</FieldLabel>
              <Select
                value={loteId}
                onValueChange={(v) => { setLoteId(v); setOperacaoId(''); setTamanhoTouched(false); setTonalidadeTouched(false); }}
              >
                <SelectTrigger id="pack-lote" aria-label="Lote" className="w-full">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {lotesSelecionaveis.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.codigo} — {l.nome}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="pack-operacao">Operação</FieldLabel>
              <Select
                value={operacaoId}
                onValueChange={(v) => { setOperacaoId(v); setTamanhoTouched(false); setTonalidadeTouched(false); }}
                disabled={!selectedLote}
              >
                <SelectTrigger id="pack-operacao" aria-label="Operação" className="w-full">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {operacoesComAloc.map(({ op, aloc }) => {
                      const isVigente = vigente?.id === aloc?.id;
                      let label = op.nome;
                      if (aloc) {
                        const inicio = aloc.horarioInicio.slice(0, 5);
                        label = `${op.nome} — ${inicio}${isVigente ? ' (vigente)' : ''}`;
                      }
                      return <SelectItem key={op.id} value={op.id}>{label}</SelectItem>;
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {selectedLote && operacoesComAloc.length === 0 && (
                <FieldDescription>Lote sem operações cadastradas.</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="pack-tamanho">Tamanho</FieldLabel>
              <Select
                value={tamanho}
                onValueChange={(v) => { setTamanho(v); setTamanhoTouched(true); }}
                disabled={!selectedLote}
              >
                <SelectTrigger id="pack-tamanho" aria-label="Tamanho" className="w-full">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {selectedLote?.tamanhos.map((t) => (
                      <SelectItem key={t.id} value={t.tamanho}>
                        {t.tamanho} ({t.quantidade} pçs no lote)
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {limite != null && (
                <FieldDescription className={cn(restante === 0 && 'text-destructive')}>
                  Já produzido: <span className="font-mono">{jaProduzido}</span> de <span className="font-mono">{limite}</span>
                  {restante != null && <> · resta(m) <span className="font-mono">{restante}</span></>}
                </FieldDescription>
              )}
            </Field>

            {temTonalidades && (
              <Field>
                <FieldLabel htmlFor="pack-tonalidade">Tonalidade</FieldLabel>
                <Select
                  value={tonalidade}
                  onValueChange={(v) => { setTonalidade(v); setTonalidadeTouched(true); }}
                  disabled={!selectedLote || !tamanho}
                >
                  <SelectTrigger id="pack-tonalidade" aria-label="Tonalidade" className="w-full">
                    <SelectValue placeholder={tamanho ? 'Selecione…' : 'Escolha o tamanho primeiro'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {tonalidadesDoTamanho.map((c) => (
                        <SelectItem key={c.id} value={c.tonalidade}>
                          {c.tonalidade} ({c.quantidade} pçs no tamanho)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {tamanho && tonalidadesDoTamanho.length === 0 && (
                  <FieldDescription>Nenhuma tonalidade com peças neste tamanho.</FieldDescription>
                )}
                {limiteTon != null && (
                  <FieldDescription className={cn(restanteTon === 0 && 'text-destructive')}>
                    Já produzido: <span className="font-mono">{jaProduzidoTon}</span> de <span className="font-mono">{limiteTon}</span>
                    {restanteTon != null && <> · resta(m) <span className="font-mono">{restanteTon}</span></>}
                  </FieldDescription>
                )}
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="pack-qtd">Quantidade de peças</FieldLabel>
              <Input
                id="pack-qtd"
                type="number"
                autoFocus
                min={1}
                inputMode="numeric"
                value={quantidade || ''}
                onChange={(e) => {
                  setQuantidade(Number(e.target.value) || 0);
                  setQuantidadeTouched(true);
                }}
                onFocus={(e) => e.currentTarget.select()}
                aria-invalid={ultrapassaria || ultrapassariaTon}
                className={cn('h-auto py-4 text-center font-mono text-3xl', (ultrapassaria || ultrapassariaTon) && 'bg-destructive/10')}
              />
              {ultrapassaria && (
                <FieldDescription className="text-destructive">
                  Ultrapassa o limite do tamanho. Máximo permitido agora: {Math.max(0, (limite ?? 0) - jaProduzido)}
                </FieldDescription>
              )}
              {ultrapassariaTon && (
                <FieldDescription className="text-destructive">
                  Ultrapassa o limite da tonalidade. Máximo permitido agora: {Math.max(0, (limiteTon ?? 0) - jaProduzidoTon)}
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" className="h-12 text-base" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-12 px-6 text-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {saving ? 'Registrando…' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
