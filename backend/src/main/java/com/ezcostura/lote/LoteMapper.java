package com.ezcostura.lote;

import com.ezcostura.lote.dto.LoteDto;
import com.ezcostura.lote.dto.OperacaoDto;
import com.ezcostura.lote.dto.TamanhoDto;

import java.util.List;
import java.util.UUID;

final class LoteMapper {

    private LoteMapper() {}

    static LoteDto toDto(Lote lote) {
        List<OperacaoDto> ops = lote.getOperacoes().stream()
            .map(o -> new OperacaoDto(o.getId(), o.getNome(), o.getMetaPorHora()))
            .toList();
        List<TamanhoDto> tams = lote.getTamanhos().stream()
            .map(t -> new TamanhoDto(t.getId(), t.getTamanho(), t.getQuantidade()))
            .toList();
        return new LoteDto(
            lote.getId(),
            lote.getCodigo(),
            lote.getNome(),
            lote.getDescricao(),
            lote.isFinalizado(),
            ops,
            tams,
            lote.getCreatedAt(),
            lote.getUpdatedAt()
        );
    }

    static void applyToEntity(LoteDto dto, Lote target) {
        target.setCodigo(dto.codigo());
        target.setNome(dto.nome());
        target.setDescricao(dto.descricao());
        target.setFinalizado(dto.finalizado());

        target.getOperacoes().clear();
        for (OperacaoDto op : dto.operacoes()) {
            UUID id = op.id() != null ? op.id() : UUID.randomUUID();
            target.getOperacoes().add(new Operacao(id, op.nome(), op.metaPorHora()));
        }

        target.getTamanhos().clear();
        for (TamanhoDto t : dto.tamanhos()) {
            UUID id = t.id() != null ? t.id() : UUID.randomUUID();
            target.getTamanhos().add(new Tamanho(id, t.tamanho(), t.quantidade()));
        }
    }
}
