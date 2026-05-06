package com.ezcostura.jornada;

import com.ezcostura.jornada.dto.DiaSemanaOverrideDto;
import com.ezcostura.jornada.dto.JornadaDto;
import com.ezcostura.jornada.dto.PausaDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class JornadaService {

    private final JornadaRepository repository;

    public JornadaService(JornadaRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<JornadaDto> findAll() {
        return repository.findAllByOrderByNomeAsc().stream().map(JornadaMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public JornadaDto findById(UUID id) {
        return JornadaMapper.toDto(repository.findById(id)
            .orElseThrow(() -> new JornadaNotFoundException(id)));
    }

    @Transactional
    public JornadaDto create(JornadaDto dto) {
        validate(dto);
        Jornada j = new Jornada();
        j.setId(dto.id() != null ? dto.id() : UUID.randomUUID());
        j.markNew();
        OffsetDateTime now = OffsetDateTime.now();
        j.setCreatedAt(now);
        j.setUpdatedAt(now);
        JornadaMapper.apply(dto, j);
        return JornadaMapper.toDto(repository.save(j));
    }

    @Transactional
    public JornadaDto update(UUID id, JornadaDto dto) {
        validate(dto);
        Jornada j = repository.findById(id)
            .orElseThrow(() -> new JornadaNotFoundException(id));
        JornadaMapper.apply(dto, j);
        j.setUpdatedAt(OffsetDateTime.now());
        return JornadaMapper.toDto(repository.save(j));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new JornadaNotFoundException(id);
        }
        repository.deleteById(id);
    }

    private void validate(JornadaDto dto) {
        if (!dto.horaFim().isAfter(dto.horaInicio())) {
            throw new IllegalArgumentException("horaFim deve ser maior que horaInicio");
        }
        // Pausas: validate per day-bucket (null = padrão; 0..6 = override).
        List<PausaDto> ps = dto.pausas() == null ? List.of() : dto.pausas();
        for (Integer dia : pausaDayBuckets(ps)) {
            List<PausaDto> bucket = ps.stream().filter(p -> equalsBucket(p.diaSemana(), dia)).toList();
            validatePausasBucket(bucket, dto.horaInicio(), dto.horaFim(), dia, dto, ps);
        }
        // Day-of-week overrides: at most one per day; valid time range; must be inside the jornada window? No — they replace it.
        List<DiaSemanaOverrideDto> ds = dto.diasSemana() == null ? List.of() : dto.diasSemana();
        Set<Integer> seen = new HashSet<>();
        for (DiaSemanaOverrideDto d : ds) {
            if (!seen.add(d.diaSemana())) {
                throw new IllegalArgumentException("Dia da semana " + d.diaSemana() + " duplicado.");
            }
            if (!d.horaFim().isAfter(d.horaInicio())) {
                throw new IllegalArgumentException("Override do dia " + d.diaSemana() + " tem horário inválido.");
            }
        }
    }

    private static Set<Integer> pausaDayBuckets(List<PausaDto> ps) {
        Set<Integer> s = new HashSet<>();
        for (PausaDto p : ps) s.add(p.diaSemana());
        if (s.isEmpty()) s.add(null);
        return s;
    }

    private static boolean equalsBucket(Integer a, Integer b) {
        return a == null ? b == null : a.equals(b);
    }

    private void validatePausasBucket(List<PausaDto> bucket,
                                      java.time.LocalTime jornadaIni,
                                      java.time.LocalTime jornadaFim,
                                      Integer dia,
                                      JornadaDto dto,
                                      List<PausaDto> all) {
        // For day-overrides, the actual window is the override window.
        java.time.LocalTime ini = jornadaIni;
        java.time.LocalTime fim = jornadaFim;
        if (dia != null && dto.diasSemana() != null) {
            for (DiaSemanaOverrideDto d : dto.diasSemana()) {
                if (d.diaSemana().equals(dia)) {
                    ini = d.horaInicio();
                    fim = d.horaFim();
                    break;
                }
            }
        }
        long almocos = bucket.stream().filter(p -> p.tipo() == TipoPausa.ALMOCO).count();
        if (almocos > 1) {
            throw new IllegalArgumentException("Apenas uma pausa de Almoço por dia é permitida.");
        }
        for (PausaDto p : bucket) {
            if (!p.horaFim().isAfter(p.horaInicio())) {
                throw new IllegalArgumentException("Pausa '" + nomeFor(p) + "' tem horário inválido.");
            }
            if (p.horaInicio().isBefore(ini) || p.horaFim().isAfter(fim)) {
                throw new IllegalArgumentException("Pausa '" + nomeFor(p) + "' está fora da jornada.");
            }
            if (p.tipo() == TipoPausa.OUTRO && (p.nome() == null || p.nome().isBlank())) {
                throw new IllegalArgumentException("Pausa do tipo Outro requer descrição.");
            }
        }
        List<PausaDto> sorted = bucket.stream().sorted(Comparator.comparing(PausaDto::horaInicio)).toList();
        for (int i = 1; i < sorted.size(); i++) {
            if (sorted.get(i).horaInicio().isBefore(sorted.get(i - 1).horaFim())) {
                throw new IllegalArgumentException(
                    "Pausas '" + nomeFor(sorted.get(i - 1)) + "' e '" + nomeFor(sorted.get(i)) + "' se sobrepõem.");
            }
        }
    }

    private static String nomeFor(PausaDto p) {
        if (p.nome() != null && !p.nome().isBlank()) return p.nome();
        return p.tipo().name();
    }
}
