package com.ezcostura.alocacao;

import com.ezcostura.alocacao.dto.AlocacaoDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AlocacaoService {

    private final AlocacaoRepository repository;

    public AlocacaoService(AlocacaoRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<AlocacaoDto> findByData(LocalDate data) {
        return repository.findByData(data).stream().map(AlocacaoMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<AlocacaoDto> findByOperarioAndData(UUID operarioId, LocalDate data) {
        return repository.findByOperarioAndData(operarioId, data).stream()
            .map(AlocacaoMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public AlocacaoDto findById(UUID id) {
        return AlocacaoMapper.toDto(repository.findById(id)
            .orElseThrow(() -> new AlocacaoNotFoundException(id)));
    }

    @Transactional
    public AlocacaoDto create(AlocacaoDto dto) {
        Alocacao a = new Alocacao();
        a.setId(dto.id() != null ? dto.id() : UUID.randomUUID());
        a.markNew();
        a.setCreatedAt(OffsetDateTime.now());
        AlocacaoMapper.apply(dto, a);
        return AlocacaoMapper.toDto(repository.save(a));
    }

    @Transactional
    public AlocacaoDto update(UUID id, AlocacaoDto dto) {
        Alocacao a = repository.findById(id)
            .orElseThrow(() -> new AlocacaoNotFoundException(id));
        AlocacaoMapper.apply(dto, a);
        return AlocacaoMapper.toDto(repository.save(a));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new AlocacaoNotFoundException(id);
        }
        repository.deleteById(id);
    }
}
