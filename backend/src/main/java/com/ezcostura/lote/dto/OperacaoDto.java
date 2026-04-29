package com.ezcostura.lote.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record OperacaoDto(
    UUID id,
    @NotBlank String nome,
    @Min(1) int metaPorHora
) {}
