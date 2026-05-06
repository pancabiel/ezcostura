package com.ezcostura.jornada;

import com.ezcostura.jornada.dto.DiaEspecialDto;
import com.ezcostura.jornada.dto.DiaEspecialPausaDto;

import java.util.List;
import java.util.UUID;

final class DiaEspecialMapper {

    private DiaEspecialMapper() {}

    static DiaEspecialDto toDto(DiaEspecial d) {
        List<DiaEspecialPausaDto> ps = d.getPausas().stream()
            .map(p -> new DiaEspecialPausaDto(p.getId(), p.getNome(), p.getHoraInicio(), p.getHoraFim(), p.getTipo()))
            .toList();
        List<UUID> ops = d.getOperarios().stream()
            .map(DiaEspecialOperario::getOperarioId)
            .toList();
        return new DiaEspecialDto(d.getId(), d.getData(), d.getDescricao(),
            d.getHoraInicio(), d.getHoraFim(), ps, ops, d.getUpdatedAt());
    }

    static void apply(DiaEspecialDto dto, DiaEspecial target) {
        target.setData(dto.data());
        target.setDescricao(dto.descricao());
        target.setHoraInicio(dto.horaInicio());
        target.setHoraFim(dto.horaFim());

        target.getPausas().clear();
        if (dto.pausas() != null) {
            for (DiaEspecialPausaDto p : dto.pausas()) {
                UUID id = p.id() != null ? p.id() : UUID.randomUUID();
                String nome = switch (p.tipo()) {
                    case ALMOCO -> "Almoço";
                    case CAFE -> "Café";
                    case OUTRO -> p.nome();
                };
                target.getPausas().add(new DiaEspecialPausa(id, nome, p.horaInicio(), p.horaFim(), p.tipo()));
            }
        }

        target.getOperarios().clear();
        if (dto.operarioIds() != null) {
            for (UUID opId : dto.operarioIds()) {
                target.getOperarios().add(new DiaEspecialOperario(UUID.randomUUID(), opId));
            }
        }
    }
}
