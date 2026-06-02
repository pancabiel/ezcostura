package com.ezcostura.operario.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record OperarioDto(
    UUID id,
    @NotBlank String nome,
    String cpf,
    String telefone,
    @NotNull LocalDate dataAdmissao,
    boolean ativo,
    @NotNull UUID jornadaId,
    boolean temPin,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
