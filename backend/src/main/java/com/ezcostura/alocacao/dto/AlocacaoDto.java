package com.ezcostura.alocacao.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AlocacaoDto(
    UUID id,
    @NotNull UUID operarioId,
    @NotNull LocalDate data,
    @NotNull LocalTime horarioInicio,
    @NotNull UUID loteId,
    @NotNull UUID operacaoId,
    OffsetDateTime createdAt
) {}
