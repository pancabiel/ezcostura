package com.ezcostura.pack.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PackDto(
    UUID id,
    @NotNull UUID operarioId,
    @NotNull LocalDate data,
    @NotNull OffsetDateTime horario,
    @NotNull UUID alocacaoId,
    @Min(1) int quantidade,
    UUID registradoPor,
    OffsetDateTime createdAt
) {}
