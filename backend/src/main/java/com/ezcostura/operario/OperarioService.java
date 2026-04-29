package com.ezcostura.operario;

import com.ezcostura.operario.dto.OperarioDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class OperarioService {

    private final OperarioRepository repository;

    public OperarioService(OperarioRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<OperarioDto> findAll(Boolean ativo) {
        List<Operario> list = (ativo == null)
            ? repository.findAllByOrderByNomeAsc()
            : repository.findAllByAtivoOrderByNomeAsc(ativo);
        return list.stream().map(OperarioMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public OperarioDto findById(UUID id) {
        Operario op = repository.findById(id)
            .orElseThrow(() -> new OperarioNotFoundException(id));
        return OperarioMapper.toDto(op);
    }

    @Transactional
    public OperarioDto create(OperarioDto dto) {
        Operario op = new Operario();
        op.setId(dto.id() != null ? dto.id() : UUID.randomUUID());
        op.markNew();
        OffsetDateTime now = OffsetDateTime.now();
        op.setCreatedAt(now);
        op.setUpdatedAt(now);
        OperarioMapper.apply(dto, op);
        return OperarioMapper.toDto(repository.save(op));
    }

    @Transactional
    public OperarioDto update(UUID id, OperarioDto dto) {
        Operario op = repository.findById(id)
            .orElseThrow(() -> new OperarioNotFoundException(id));
        OperarioMapper.apply(dto, op);
        op.setUpdatedAt(OffsetDateTime.now());
        return OperarioMapper.toDto(repository.save(op));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new OperarioNotFoundException(id);
        }
        repository.deleteById(id);
    }
}
