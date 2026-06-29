package com.ezcostura.lote.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.List;
import java.util.UUID;

public record TamanhoDto(
    UUID id,
    @NotBlank String tamanho,
    @Min(0) int quantidade,
    @Valid List<TamanhoTonalidadeDto> tonalidades
) {}
