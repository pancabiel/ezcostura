package com.ezcostura.lote;

import com.ezcostura.lote.dto.LoteDto;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class LoteService {

    private final LoteRepository repository;

    public LoteService(LoteRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<LoteDto> findAll() {
        return java.util.stream.StreamSupport
            .stream(repository.findAll().spliterator(), false)
            .map(LoteMapper::toDto)
            .toList();
    }

    @Transactional(readOnly = true)
    public LoteDto findById(UUID id) {
        Lote lote = repository.findById(id)
            .orElseThrow(() -> new LoteNotFoundException(id));
        return LoteMapper.toDto(lote);
    }

    @Transactional
    public LoteDto create(LoteDto dto) {
        validateTonalidades(dto);
        if (repository.existsByCodigo(dto.codigo())) {
            throw new DuplicateKeyException("Lote com código '" + dto.codigo() + "' já existe");
        }
        Lote lote = new Lote();
        lote.setId(dto.id() != null ? dto.id() : UUID.randomUUID());
        lote.markNew();
        OffsetDateTime now = OffsetDateTime.now();
        lote.setCreatedAt(now);
        lote.setUpdatedAt(now);
        LoteMapper.applyToEntity(dto, lote);
        Lote saved = repository.save(lote);
        return LoteMapper.toDto(saved);
    }

    @Transactional
    public LoteDto update(UUID id, LoteDto dto) {
        validateTonalidades(dto);
        Lote lote = repository.findById(id)
            .orElseThrow(() -> new LoteNotFoundException(id));
        LoteMapper.applyToEntity(dto, lote);
        lote.setUpdatedAt(OffsetDateTime.now());
        Lote saved = repository.save(lote);
        return LoteMapper.toDto(saved);
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new LoteNotFoundException(id);
        }
        repository.deleteById(id);
    }

    /**
     * Quando o lote trabalha com tonalidades, exige ao menos uma cor e nomes únicos
     * (case-insensitive) e não-vazios — senão o select de pack fica ambíguo. Zeros nas
     * células são permitidos (rascunho); a validação de bean já cobre o ≥ 0.
     */
    private void validateTonalidades(LoteDto dto) {
        if (!dto.temTonalidades()) return;
        List<com.ezcostura.lote.dto.TonalidadeDto> tons = dto.tonalidades();
        if (tons == null || tons.isEmpty()) {
            throw new IllegalArgumentException("Informe ao menos uma tonalidade quando o lote trabalha com tonalidades.");
        }
        var vistos = new java.util.HashSet<String>();
        for (var t : tons) {
            if (t.tonalidade() == null || t.tonalidade().isBlank()) {
                throw new IllegalArgumentException("Toda tonalidade precisa de um nome.");
            }
            if (!vistos.add(t.tonalidade().trim().toLowerCase())) {
                throw new IllegalArgumentException("Tonalidade '" + t.tonalidade().trim() + "' está duplicada.");
            }
        }
    }
}
