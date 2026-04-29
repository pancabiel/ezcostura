package com.ezcostura.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank String tenantId,
    @NotBlank String username,
    @NotBlank String password
) {}
