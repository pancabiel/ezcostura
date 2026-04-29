package com.ezcostura.ausencia.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AusenciaDto(
    UUID id,
    @NotNull UUID operarioId,
    @NotNull LocalDate dataInicio,
    @NotNull LocalDate dataFim,
    @NotNull @Pattern(regexp = "ATESTADO|FALTA|FERIAS|FOLGA") String tipo,
    String observacao,
    OffsetDateTime createdAt
) {}
