package com.ezcostura.operario;

import com.ezcostura.operario.dto.OperarioDto;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class OperarioService {

    private final OperarioRepository repository;
    private final PasswordEncoder passwordEncoder;

    public OperarioService(OperarioRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
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
        OperarioMapper.apply(dto, op); // normaliza o CPF para só dígitos
        applyDefaultPin(op);
        return OperarioMapper.toDto(repository.save(op));
    }

    /**
     * PIN inicial = 4 primeiros dígitos do CPF. O operário troca no primeiro acesso.
     * Sem CPF (ou com menos de 4 dígitos) o operário nasce sem acesso ao portal.
     */
    private void applyDefaultPin(Operario op) {
        String cpf = op.getCpf();
        if (cpf != null && cpf.length() >= 4) {
            op.setPinHash(passwordEncoder.encode(cpf.substring(0, 4)));
            op.setPinChangedAt(op.getCreatedAt());
            op.setPinFailedAttempts(0);
            op.setPinLockedUntil(null);
        }
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

    @Transactional
    public void setPin(UUID id, String pin) {
        Operario op = repository.findById(id)
            .orElseThrow(() -> new OperarioNotFoundException(id));
        if (op.getCpf() == null || op.getCpf().isBlank()) {
            throw new IllegalArgumentException("Operário precisa ter CPF cadastrado para usar o portal");
        }
        op.setPinHash(passwordEncoder.encode(pin));
        op.setPinChangedAt(OffsetDateTime.now());
        op.setPinFailedAttempts(0);
        op.setPinLockedUntil(null);
        op.setUpdatedAt(OffsetDateTime.now());
        repository.save(op);
    }

    @Transactional
    public void removePin(UUID id) {
        Operario op = repository.findById(id)
            .orElseThrow(() -> new OperarioNotFoundException(id));
        op.setPinHash(null);
        op.setPinChangedAt(null);
        op.setPinFailedAttempts(0);
        op.setPinLockedUntil(null);
        op.setUpdatedAt(OffsetDateTime.now());
        repository.save(op);
    }
}
