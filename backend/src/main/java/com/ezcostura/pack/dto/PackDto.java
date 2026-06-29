package com.ezcostura.pack.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PackDto(
    UUID id,
    @NotNull UUID operarioId,
    @NotNull LocalDate data,
    @NotNull OffsetDateTime horario,
    @NotNull UUID alocacaoId,
    @NotNull UUID loteId,
    @NotNull UUID operacaoId,
    @NotBlank String loteCodigo,
    @NotBlank String operacaoNome,
    @Min(1) int quantidade,
    @NotBlank String tamanho,
    @Size(max = 32) String tonalidade,
    UUID registradoPor,
    OffsetDateTime createdAt
) {}
