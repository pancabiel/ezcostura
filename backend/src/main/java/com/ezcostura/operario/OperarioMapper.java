package com.ezcostura.operario;

import com.ezcostura.operario.dto.OperarioDto;

final class OperarioMapper {
    private OperarioMapper() {}

    static OperarioDto toDto(Operario o) {
        return new OperarioDto(
            o.getId(), o.getNome(), o.getCpf(), o.getTelefone(),
            o.getDataAdmissao(), o.isAtivo(), o.getJornadaId(),
            o.getCreatedAt(), o.getUpdatedAt()
        );
    }

    static void apply(OperarioDto dto, Operario target) {
        target.setNome(dto.nome());
        target.setCpf(emptyToNull(dto.cpf()));
        target.setTelefone(emptyToNull(dto.telefone()));
        target.setDataAdmissao(dto.dataAdmissao());
        target.setAtivo(dto.ativo());
        target.setJornadaId(dto.jornadaId());
    }

    private static String emptyToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
