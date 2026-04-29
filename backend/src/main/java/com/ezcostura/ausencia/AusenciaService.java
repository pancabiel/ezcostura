package com.ezcostura.ausencia;

import com.ezcostura.ausencia.dto.AusenciaDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AusenciaService {

    private final AusenciaRepository repository;

    public AusenciaService(AusenciaRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<AusenciaDto> findByPeriodo(LocalDate de, LocalDate ate, UUID operarioId) {
        List<Ausencia> rows = operarioId != null
            ? repository.findByOperarioAndPeriodo(operarioId, de, ate)
            : repository.findByPeriodo(de, ate);
        return rows.stream().map(AusenciaMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<AusenciaDto> findActiveOn(LocalDate data) {
        return repository.findActiveOn(data).stream().map(AusenciaMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public AusenciaDto findById(UUID id) {
        return AusenciaMapper.toDto(repository.findById(id)
            .orElseThrow(() -> new AusenciaNotFoundException(id)));
    }

    @Transactional
    public AusenciaDto create(AusenciaDto dto) {
        validate(dto);
        Ausencia a = new Ausencia();
        a.setId(dto.id() != null ? dto.id() : UUID.randomUUID());
        a.markNew();
        a.setCreatedAt(OffsetDateTime.now());
        AusenciaMapper.apply(dto, a);
        return AusenciaMapper.toDto(repository.save(a));
    }

    @Transactional
    public AusenciaDto update(UUID id, AusenciaDto dto) {
        validate(dto);
        Ausencia a = repository.findById(id).orElseThrow(() -> new AusenciaNotFoundException(id));
        AusenciaMapper.apply(dto, a);
        return AusenciaMapper.toDto(repository.save(a));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new AusenciaNotFoundException(id);
        }
        repository.deleteById(id);
    }

    private void validate(AusenciaDto dto) {
        if (dto.dataFim().isBefore(dto.dataInicio())) {
            throw new IllegalArgumentException("dataFim deve ser maior ou igual a dataInicio");
        }
    }
}
