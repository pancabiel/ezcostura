package com.ezcostura.desempenho.dto;

import java.util.UUID;

/**
 * Uma linha do desempenho diário: uma alocação do operário, com horas trabalhadas
 * naquela operação, meta calculada (meta/h × horas), produzido (somatório dos packs
 * registrados naquela alocação) e percentual.
 */
public record DesempenhoItemDto(
    UUID alocacaoId,
    UUID loteId,
    String loteCodigo,
    UUID operacaoId,
    String operacaoNome,
    int metaPorHora,
    String horarioInicio,
    double horas,
    int meta,
    int produzido,
    int pct
) {}
