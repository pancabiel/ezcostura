package com.ezcostura.lote.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record LoteDto(
    UUID id,
    @NotBlank String codigo,
    @NotBlank String nome,
    String descricao,
    boolean finalizado,
    @NotNull @Valid List<OperacaoDto> operacoes,
    @NotNull @Valid List<TamanhoDto> tamanhos,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
