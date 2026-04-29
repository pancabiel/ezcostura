package com.ezcostura.pack;

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

    public PackService(PackRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<PackDto> findByData(LocalDate data, UUID operarioId) {
        List<Pack> packs = (operarioId == null)
            ? repository.findByData(data)
            : repository.findByOperarioAndData(operarioId, data);
        return packs.stream().map(PackMapper::toDto).toList();
    }

    @Transactional
    public PackDto create(PackDto dto) {
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
}
