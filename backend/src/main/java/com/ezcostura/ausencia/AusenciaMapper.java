package com.ezcostura.ausencia;

import com.ezcostura.ausencia.dto.AusenciaDto;

final class AusenciaMapper {
    private AusenciaMapper() {}

    static AusenciaDto toDto(Ausencia a) {
        return new AusenciaDto(
            a.getId(), a.getOperarioId(), a.getDataInicio(), a.getDataFim(),
            a.getTipo(), a.getObservacao(), a.getCreatedAt()
        );
    }

    static void apply(AusenciaDto dto, Ausencia target) {
        target.setOperarioId(dto.operarioId());
        target.setDataInicio(dto.dataInicio());
        target.setDataFim(dto.dataFim());
        target.setTipo(dto.tipo());
        target.setObservacao(dto.observacao());
    }
}
