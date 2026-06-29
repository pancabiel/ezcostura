package com.ezcostura.pack;

import com.ezcostura.pack.dto.PackDto;

final class PackMapper {
    private PackMapper() {}

    static PackDto toDto(Pack p) {
        return new PackDto(
            p.getId(), p.getOperarioId(), p.getData(), p.getHorario(),
            p.getAlocacaoId(), p.getLoteId(), p.getOperacaoId(),
            p.getLoteCodigo(), p.getOperacaoNome(),
            p.getQuantidade(), p.getTamanho(), p.getTonalidade(), p.getRegistradoPor(), p.getCreatedAt()
        );
    }

    static void apply(PackDto dto, Pack target) {
        target.setOperarioId(dto.operarioId());
        target.setData(dto.data());
        target.setHorario(dto.horario());
        target.setAlocacaoId(dto.alocacaoId());
        target.setLoteId(dto.loteId());
        target.setOperacaoId(dto.operacaoId());
        target.setLoteCodigo(dto.loteCodigo());
        target.setOperacaoNome(dto.operacaoNome());
        target.setQuantidade(dto.quantidade());
        target.setTamanho(dto.tamanho());
        target.setTonalidade(dto.tonalidade());
        target.setRegistradoPor(dto.registradoPor());
    }
}
