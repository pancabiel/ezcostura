package com.ezcostura.jornada;

import com.ezcostura.jornada.dto.ConfiguracaoJornadaDto;
import com.ezcostura.jornada.dto.PausaDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class ConfiguracaoJornadaService {

    private static final UUID SINGLETON_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final ConfiguracaoJornadaRepository repository;

    public ConfiguracaoJornadaService(ConfiguracaoJornadaRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public ConfiguracaoJornadaDto get() {
        ConfiguracaoJornada c = repository.findById(SINGLETON_ID).orElseGet(this::seedDefault);
        return ConfiguracaoJornadaMapper.toDto(c);
    }

    @Transactional
    public ConfiguracaoJornadaDto update(ConfiguracaoJornadaDto dto) {
        validate(dto);
        ConfiguracaoJornada c = repository.findById(SINGLETON_ID).orElseGet(() -> {
            ConfiguracaoJornada novo = new ConfiguracaoJornada();
            novo.setId(SINGLETON_ID);
            novo.markNew();
            novo.setCreatedAt(OffsetDateTime.now());
            return novo;
        });
        ConfiguracaoJornadaMapper.apply(dto, c);
        c.setUpdatedAt(OffsetDateTime.now());
        return ConfiguracaoJornadaMapper.toDto(repository.save(c));
    }

    private ConfiguracaoJornada seedDefault() {
        ConfiguracaoJornada c = new ConfiguracaoJornada();
        c.setId(SINGLETON_ID);
        c.markNew();
        c.setHoraInicio(LocalTime.of(7, 0));
        c.setHoraFim(LocalTime.of(17, 0));
        c.setCreatedAt(OffsetDateTime.now());
        c.setUpdatedAt(OffsetDateTime.now());
        return repository.save(c);
    }

    private void validate(ConfiguracaoJornadaDto dto) {
        if (!dto.horaFim().isAfter(dto.horaInicio())) {
            throw new IllegalArgumentException("horaFim deve ser maior que horaInicio");
        }
        List<PausaDto> ps = dto.pausas() == null ? List.of() : dto.pausas();
        long almocos = ps.stream().filter(p -> p.tipo() == com.ezcostura.jornada.TipoPausa.ALMOCO).count();
        if (almocos > 1) {
            throw new IllegalArgumentException("Apenas uma pausa de Almoço é permitida");
        }
        for (PausaDto p : ps) {
            if (!p.horaFim().isAfter(p.horaInicio())) {
                throw new IllegalArgumentException("Pausa '" + p.nome() + "' tem horário inválido");
            }
            if (p.horaInicio().isBefore(dto.horaInicio()) || p.horaFim().isAfter(dto.horaFim())) {
                throw new IllegalArgumentException("Pausa '" + p.nome() + "' fora da jornada");
            }
            if (p.tipo() == com.ezcostura.jornada.TipoPausa.OUTRO
                && (p.nome() == null || p.nome().isBlank())) {
                throw new IllegalArgumentException("Pausa do tipo Outro requer descrição");
            }
        }
        List<PausaDto> sorted = ps.stream().sorted(Comparator.comparing(PausaDto::horaInicio)).toList();
        for (int i = 1; i < sorted.size(); i++) {
            if (!sorted.get(i).horaInicio().isAfter(sorted.get(i - 1).horaFim())
                && !sorted.get(i).horaInicio().equals(sorted.get(i - 1).horaFim())) {
                throw new IllegalArgumentException(
                    "Pausas '" + sorted.get(i - 1).nome() + "' e '" + sorted.get(i).nome() + "' se sobrepõem");
            }
        }
    }
}
