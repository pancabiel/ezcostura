package com.ezcostura.desempenho.dto;

import java.time.LocalDate;
import java.util.List;

public record DesempenhoPeriodoDto(
    LocalDate inicio,
    LocalDate fim,
    List<DesempenhoDiaDto> dias,
    int totalMeta,
    int totalProduzido,
    int totalPct
) {}
