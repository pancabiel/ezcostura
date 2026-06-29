package com.ezcostura.lote.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/** Célula da matriz: quantidade de uma tonalidade dentro de um tamanho. */
public record TamanhoTonalidadeDto(
    UUID id,
    @NotBlank @Size(max = 32) String tonalidade,
    @Min(0) int quantidade
) {}
