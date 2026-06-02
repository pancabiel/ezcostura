package com.ezcostura.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record OperarioLoginRequest(
    @NotBlank String tenantId,
    @NotBlank String cpf,
    @NotBlank String pin
) {}
