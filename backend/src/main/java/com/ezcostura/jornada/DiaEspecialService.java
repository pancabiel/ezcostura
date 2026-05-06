package com.ezcostura.jornada;

import com.ezcostura.jornada.dto.DiaEspecialDto;
import com.ezcostura.jornada.dto.DiaEspecialPausaDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class DiaEspecialService {

    private final DiaEspecialRepository repository;

    public DiaEspecialService(DiaEspecialRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<DiaEspecialDto> findAll() {
        return repository.findAllByOrderByDataDesc().stream().map(DiaEspecialMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public DiaEspecialDto findById(UUID id) {
        return DiaEspecialMapper.toDto(repository.findById(id)
            .orElseThrow(() -> new DiaEspecialNotFoundException(id)));
    }

    @Transactional
    public DiaEspecialDto create(DiaEspecialDto dto) {
        validate(dto);
        DiaEspecial d = new DiaEspecial();
        d.setId(dto.id() != null ? dto.id() : UUID.randomUUID());
        d.markNew();
        OffsetDateTime now = OffsetDateTime.now();
        d.setCreatedAt(now);
        d.setUpdatedAt(now);
        DiaEspecialMapper.apply(dto, d);
        return DiaEspecialMapper.toDto(repository.save(d));
    }

    @Transactional
    public DiaEspecialDto update(UUID id, DiaEspecialDto dto) {
        validate(dto);
        DiaEspecial d = repository.findById(id)
            .orElseThrow(() -> new DiaEspecialNotFoundException(id));
        DiaEspecialMapper.apply(dto, d);
        d.setUpdatedAt(OffsetDateTime.now());
        return DiaEspecialMapper.toDto(repository.save(d));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new DiaEspecialNotFoundException(id);
        }
        repository.deleteById(id);
    }

    private void validate(DiaEspecialDto dto) {
        if (!dto.horaFim().isAfter(dto.horaInicio())) {
            throw new IllegalArgumentException("horaFim deve ser maior que horaInicio");
        }
        if (dto.operarioIds() == null || dto.operarioIds().isEmpty()) {
            throw new IllegalArgumentException("Selecione pelo menos um operário para o dia especial.");
        }
        List<DiaEspecialPausaDto> ps = dto.pausas() == null ? List.of() : dto.pausas();
        long almocos = ps.stream().filter(p -> p.tipo() == TipoPausa.ALMOCO).count();
        if (almocos > 1) throw new IllegalArgumentException("Apenas uma pausa de Almoço é permitida.");
        for (DiaEspecialPausaDto p : ps) {
            if (!p.horaFim().isAfter(p.horaInicio())) {
                throw new IllegalArgumentException("Pausa tem horário inválido.");
            }
            if (p.horaInicio().isBefore(dto.horaInicio()) || p.horaFim().isAfter(dto.horaFim())) {
                throw new IllegalArgumentException("Pausa está fora da jornada do dia especial.");
            }
            if (p.tipo() == TipoPausa.OUTRO && (p.nome() == null || p.nome().isBlank())) {
                throw new IllegalArgumentException("Pausa do tipo Outro requer descrição.");
            }
        }
        List<DiaEspecialPausaDto> sorted = ps.stream().sorted(Comparator.comparing(DiaEspecialPausaDto::horaInicio)).toList();
        for (int i = 1; i < sorted.size(); i++) {
            if (sorted.get(i).horaInicio().isBefore(sorted.get(i - 1).horaFim())) {
                throw new IllegalArgumentException("Pausas se sobrepõem.");
            }
        }
    }
}
