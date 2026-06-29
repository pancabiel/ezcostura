package com.ezcostura.pack;

import com.ezcostura.alocacao.AlocacaoRepository;
import com.ezcostura.lote.Lote;
import com.ezcostura.lote.LoteRepository;
import com.ezcostura.lote.Tamanho;
import com.ezcostura.lote.TamanhoTonalidade;
import com.ezcostura.pack.dto.PackDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class PackService {

    private final PackRepository repository;
    private final AlocacaoRepository alocacaoRepository;
    private final LoteRepository loteRepository;

    public PackService(PackRepository repository,
                       AlocacaoRepository alocacaoRepository,
                       LoteRepository loteRepository) {
        this.repository = repository;
        this.alocacaoRepository = alocacaoRepository;
        this.loteRepository = loteRepository;
    }

    @Transactional(readOnly = true)
    public List<PackDto> findByData(LocalDate data, UUID operarioId) {
        List<Pack> packs = (operarioId == null)
            ? repository.findByData(data)
            : repository.findByOperarioAndData(operarioId, data);
        return packs.stream().map(PackMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PackDto> findByDataBetween(LocalDate inicio, LocalDate fim) {
        return repository.findByDataBetween(inicio, fim).stream().map(PackMapper::toDto).toList();
    }

    @Transactional
    public PackDto create(PackDto dto) {
        var aloc = alocacaoRepository.findById(dto.alocacaoId())
            .orElseThrow(() -> new IllegalArgumentException("Alocação não encontrada."));
        Lote lote = loteRepository.findById(aloc.getLoteId())
            .orElseThrow(() -> new IllegalArgumentException("Lote não encontrado."));
        var operacao = lote.getOperacoes().stream()
            .filter(o -> o.getId().equals(aloc.getOperacaoId()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Operação não encontrada no lote."));
        // Lote com tonalidades: trava única por célula (tamanho × tonalidade).
        // Sem tonalidades: trava pelo total do tamanho, como antes.
        if (lote.isTemTonalidades()) {
            validateCelulaLimit(dto, lote, operacao.getId());
        } else {
            validateTamanhoLimit(dto, lote, operacao.getId());
        }

        Pack p = new Pack();
        p.setId(dto.id() != null ? dto.id() : UUID.randomUUID());
        p.markNew();
        p.setCreatedAt(OffsetDateTime.now());
        PackMapper.apply(dto, p);
        // Snapshot autoritativo do servidor — ignora os campos derivados que vieram do cliente.
        p.setLoteId(lote.getId());
        p.setOperacaoId(operacao.getId());
        p.setLoteCodigo(lote.getCodigo());
        p.setOperacaoNome(operacao.getNome());
        // Tonalidade só vale quando o lote trabalha com tonalidades; caso contrário, descarta.
        if (!lote.isTemTonalidades()) {
            p.setTonalidade(null);
        }
        return PackMapper.toDto(repository.save(p));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new PackNotFoundException(id);
        }
        repository.deleteById(id);
    }

    // Lote sem tonalidades: trava pelo total do tamanho.
    private void validateTamanhoLimit(PackDto dto, Lote lote, UUID operacaoId) {
        var tamanho = lote.getTamanhos().stream()
            .filter(t -> t.getTamanho().equals(dto.tamanho()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "Tamanho '" + dto.tamanho() + "' não cadastrado no lote."));
        long jaProduzido = repository.sumByLoteTamanhoOperacao(
            lote.getId(), dto.tamanho(), operacaoId);
        long total = jaProduzido + dto.quantidade();
        if (total > tamanho.getQuantidade()) {
            long restante = Math.max(0, tamanho.getQuantidade() - jaProduzido);
            throw new IllegalArgumentException(
                "Estouro do limite do lote: o tamanho '" + dto.tamanho()
                + "' já tem " + jaProduzido + " peça(s) produzidas para esta operação"
                + " (limite " + tamanho.getQuantidade() + "). Resta(m) " + restante + " peça(s).");
        }
    }

    // Lote com tonalidades: trava pela célula (tamanho × tonalidade). A tonalidade é
    // obrigatória e precisa existir no tamanho escolhido.
    private void validateCelulaLimit(PackDto dto, Lote lote, UUID operacaoId) {
        Tamanho tamanho = lote.getTamanhos().stream()
            .filter(t -> t.getTamanho().equals(dto.tamanho()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "Tamanho '" + dto.tamanho() + "' não cadastrado no lote."));
        if (dto.tonalidade() == null || dto.tonalidade().isBlank()) {
            throw new IllegalArgumentException("Selecione uma tonalidade.");
        }
        TamanhoTonalidade celula = tamanho.getTonalidades().stream()
            .filter(c -> c.getTonalidade().equals(dto.tonalidade()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "Tonalidade '" + dto.tonalidade() + "' não cadastrada no tamanho '" + dto.tamanho() + "'."));
        long jaProduzido = repository.sumByLoteTamanhoTonalidadeOperacao(
            lote.getId(), dto.tamanho(), dto.tonalidade(), operacaoId);
        long total = jaProduzido + dto.quantidade();
        if (total > celula.getQuantidade()) {
            long restante = Math.max(0, celula.getQuantidade() - jaProduzido);
            throw new IllegalArgumentException(
                "Estouro do limite do lote: a tonalidade '" + dto.tonalidade()
                + "' no tamanho '" + dto.tamanho() + "' já tem " + jaProduzido
                + " peça(s) produzidas para esta operação (limite " + celula.getQuantidade()
                + "). Resta(m) " + restante + " peça(s).");
        }
    }
}
