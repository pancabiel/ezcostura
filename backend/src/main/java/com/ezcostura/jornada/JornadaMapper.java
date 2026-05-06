package com.ezcostura.jornada;

import com.ezcostura.jornada.dto.DiaSemanaOverrideDto;
import com.ezcostura.jornada.dto.JornadaDto;
import com.ezcostura.jornada.dto.PausaDto;

import java.util.List;
import java.util.UUID;

final class JornadaMapper {

    private JornadaMapper() {}

    static JornadaDto toDto(Jornada j) {
        List<PausaDto> ps = j.getPausas().stream()
            .map(p -> new PausaDto(p.getId(), p.getNome(), p.getHoraInicio(), p.getHoraFim(),
                p.getTipo(), p.getDiaSemana()))
            .toList();
        List<DiaSemanaOverrideDto> ds = j.getDiasSemana().stream()
            .map(d -> new DiaSemanaOverrideDto(d.getId(), d.getDiaSemana(), d.getHoraInicio(), d.getHoraFim()))
            .toList();
        return new JornadaDto(j.getId(), j.getNome(), j.getHoraInicio(), j.getHoraFim(), ps, ds, j.getUpdatedAt());
    }

    static void apply(JornadaDto dto, Jornada target) {
        target.setNome(dto.nome());
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
                target.getPausas().add(new Pausa(id, nome, p.horaInicio(), p.horaFim(), p.tipo(), p.diaSemana()));
            }
        }

        target.getDiasSemana().clear();
        if (dto.diasSemana() != null) {
            for (DiaSemanaOverrideDto d : dto.diasSemana()) {
                UUID id = d.id() != null ? d.id() : UUID.randomUUID();
                target.getDiasSemana().add(new JornadaDiaSemana(id, d.diaSemana(), d.horaInicio(), d.horaFim()));
            }
        }
    }
}
