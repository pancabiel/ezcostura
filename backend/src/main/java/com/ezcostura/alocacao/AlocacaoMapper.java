package com.ezcostura.alocacao;

import com.ezcostura.alocacao.dto.AlocacaoDto;

final class AlocacaoMapper {
    private AlocacaoMapper() {}

    static AlocacaoDto toDto(Alocacao a) {
        return new AlocacaoDto(
            a.getId(), a.getOperarioId(), a.getData(), a.getHorarioInicio(),
            a.getLoteId(), a.getTamanho(), a.getOperacaoId(), a.getCreatedAt()
        );
    }

    static void apply(AlocacaoDto dto, Alocacao target) {
        target.setOperarioId(dto.operarioId());
        target.setData(dto.data());
        target.setHorarioInicio(dto.horarioInicio());
        target.setLoteId(dto.loteId());
        target.setTamanho(dto.tamanho());
        target.setOperacaoId(dto.operacaoId());
    }
}
