package com.ezcostura.relatorio.dto;

import java.time.LocalDate;
import java.util.UUID;

public record ProducaoOperarioDiaDto(UUID operarioId, LocalDate data, long total) {}
