package com.ezcostura.lote.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/** Nome de tonalidade compartilhado pelo lote (coluna da matriz). */
public record TonalidadeDto(
    UUID id,
    @NotBlank @Size(max = 32) String tonalidade
) {}
