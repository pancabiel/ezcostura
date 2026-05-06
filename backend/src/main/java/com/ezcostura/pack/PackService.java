package com.ezcostura.pack;

import com.ezcostura.alocacao.AlocacaoRepository;
import com.ezcostura.lote.Lote;
import com.ezcostura.lote.LoteRepository;
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
        validateLimit(dto);
        Pack p = new Pack();
        p.setId(dto.id() != null ? dto.id() : UUID.randomUUID());
        p.markNew();
        p.setCreatedAt(OffsetDateTime.now());
        PackMapper.apply(dto, p);
        return PackMapper.toDto(repository.save(p));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new PackNotFoundException(id);
        }
        repository.deleteById(id);
    }

    private void validateLimit(PackDto dto) {
        var aloc = alocacaoRepository.findById(dto.alocacaoId())
            .orElseThrow(() -> new IllegalArgumentException("Alocação não encontrada."));
        Lote lote = loteRepository.findById(aloc.getLoteId())
            .orElseThrow(() -> new IllegalArgumentException("Lote não encontrado."));
        var tamanho = lote.getTamanhos().stream()
            .filter(t -> t.getTamanho().equals(dto.tamanho()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "Tamanho '" + dto.tamanho() + "' não cadastrado no lote."));
        long jaProduzido = repository.sumByLoteTamanhoOperacao(
            lote.getId(), dto.tamanho(), aloc.getOperacaoId());
        long total = jaProduzido + dto.quantidade();
        if (total > tamanho.getQuantidade()) {
            long restante = Math.max(0, tamanho.getQuantidade() - jaProduzido);
            throw new IllegalArgumentException(
                "Estouro do limite do lote: o tamanho '" + dto.tamanho()
                + "' já tem " + jaProduzido + " peça(s) produzidas para esta operação"
                + " (limite " + tamanho.getQuantidade() + "). Resta(m) " + restante + " peça(s).");
        }
    }
}
