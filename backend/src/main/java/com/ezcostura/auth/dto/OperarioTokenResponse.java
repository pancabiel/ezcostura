package com.ezcostura.auth.dto;

import com.ezcostura.auth.Role;

import java.util.UUID;

public record OperarioTokenResponse(
    String accessToken,
    String refreshToken,
    UUID operarioId,
    String nome,
    String tenantId,
    Role role
) {}
