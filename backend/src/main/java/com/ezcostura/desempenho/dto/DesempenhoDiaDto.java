package com.ezcostura.desempenho.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Desempenho de um operário num único dia: itens (por alocação) + totais.
 * totalPct é a média das porcentagens das alocações com meta > 0 (igual ao frontend).
 */
public record DesempenhoDiaDto(
    LocalDate data,
    boolean ausente,
    String jornadaOrigem,
    String horaInicio,
    String horaFim,
    List<DesempenhoItemDto> itens,
    int totalMeta,
    int totalProduzido,
    int totalPct
) {}
