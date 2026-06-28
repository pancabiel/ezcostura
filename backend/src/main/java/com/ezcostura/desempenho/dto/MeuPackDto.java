package com.ezcostura.desempenho.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Um pack individual do próprio operário, para a self-view do portal: deixa o
 * funcionário conferir os registros (horário + quantidade) de cada operação.
 * {@code operacaoId} permite agrupar os packs sob cada operação na tela.
 */
public record MeuPackDto(
    UUID id,
    OffsetDateTime horario,
    UUID alocacaoId,
    UUID operacaoId,
    String operacaoNome,
    String loteCodigo,
    String tamanho,
    int quantidade
) {}
