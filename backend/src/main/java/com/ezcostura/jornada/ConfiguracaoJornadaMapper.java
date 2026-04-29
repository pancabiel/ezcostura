package com.ezcostura.jornada;

import com.ezcostura.jornada.dto.ConfiguracaoJornadaDto;
import com.ezcostura.jornada.dto.PausaDto;

import java.util.List;
import java.util.UUID;

final class ConfiguracaoJornadaMapper {

    private ConfiguracaoJornadaMapper() {}

    static ConfiguracaoJornadaDto toDto(ConfiguracaoJornada c) {
        List<PausaDto> ps = c.getPausas().stream()
            .map(p -> new PausaDto(p.getId(), p.getNome(), p.getHoraInicio(), p.getHoraFim(), p.getTipo()))
            .toList();
        return new ConfiguracaoJornadaDto(c.getId(), c.getHoraInicio(), c.getHoraFim(), ps, c.getUpdatedAt());
    }

    static void apply(ConfiguracaoJornadaDto dto, ConfiguracaoJornada target) {
        target.setHoraInicio(dto.horaInicio());
        target.setHoraFim(dto.horaFim());
        target.getPausas().clear();
        if (dto.pausas() != null) {
            for (PausaDto p : dto.pausas()) {
                UUID id = p.id() != null ? p.id() : UUID.randomUUID();
                String nome = switch (p.tipo()) {
                    case ALMOCO -> "Almoço";
                    case CAFE -> "Café";
                    case OUTRO -> p.nome();
                };
                target.getPausas().add(new Pausa(id, nome, p.horaInicio(), p.horaFim(), p.tipo()));
            }
        }
    }
}
