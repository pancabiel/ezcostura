package com.ezcostura.lote;

import com.ezcostura.lote.dto.LoteDto;
import com.ezcostura.lote.dto.OperacaoDto;
import com.ezcostura.lote.dto.TamanhoDto;
import com.ezcostura.lote.dto.TamanhoTonalidadeDto;
import com.ezcostura.lote.dto.TonalidadeDto;

import java.util.List;
import java.util.UUID;

final class LoteMapper {

    private LoteMapper() {}

    static LoteDto toDto(Lote lote) {
        List<OperacaoDto> ops = lote.getOperacoes().stream()
            .map(o -> new OperacaoDto(o.getId(), o.getNome(), o.getMetaPorHora()))
            .toList();
        List<TamanhoDto> tams = lote.getTamanhos().stream()
            .map(t -> new TamanhoDto(
                t.getId(), t.getTamanho(), t.getQuantidade(),
                t.getTonalidades().stream()
                    .map(c -> new TamanhoTonalidadeDto(c.getId(), c.getTonalidade(), c.getQuantidade()))
                    .toList()))
            .toList();
        List<TonalidadeDto> tons = lote.getTonalidades().stream()
            .map(t -> new TonalidadeDto(t.getId(), t.getTonalidade()))
            .toList();
        return new LoteDto(
            lote.getId(),
            lote.getCodigo(),
            lote.getNome(),
            lote.getDescricao(),
            lote.isFinalizado(),
            lote.isTemTonalidades(),
            ops,
            tams,
            tons,
            lote.getCreatedAt(),
            lote.getUpdatedAt()
        );
    }

    static void applyToEntity(LoteDto dto, Lote target) {
        target.setCodigo(dto.codigo());
        target.setNome(dto.nome());
        target.setDescricao(dto.descricao());
        target.setFinalizado(dto.finalizado());
        target.setTemTonalidades(dto.temTonalidades());

        target.getOperacoes().clear();
        for (OperacaoDto op : dto.operacoes()) {
            UUID id = op.id() != null ? op.id() : UUID.randomUUID();
            target.getOperacoes().add(new Operacao(id, op.nome(), op.metaPorHora()));
        }

        target.getTamanhos().clear();
        for (TamanhoDto t : dto.tamanhos()) {
            UUID id = t.id() != null ? t.id() : UUID.randomUUID();
            Tamanho tamanho = new Tamanho(id, t.tamanho(), t.quantidade());
            if (t.tonalidades() != null) {
                for (TamanhoTonalidadeDto c : t.tonalidades()) {
                    UUID cid = c.id() != null ? c.id() : UUID.randomUUID();
                    tamanho.getTonalidades().add(new TamanhoTonalidade(cid, c.tonalidade(), c.quantidade()));
                }
            }
            target.getTamanhos().add(tamanho);
        }

        target.getTonalidades().clear();
        if (dto.tonalidades() != null) {
            for (TonalidadeDto t : dto.tonalidades()) {
                UUID id = t.id() != null ? t.id() : UUID.randomUUID();
                target.getTonalidades().add(new Tonalidade(id, t.tonalidade()));
            }
        }
    }
}
