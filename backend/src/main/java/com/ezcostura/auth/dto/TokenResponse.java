package com.ezcostura.auth.dto;

import com.ezcostura.auth.Role;

import java.util.UUID;

public record TokenResponse(
    String accessToken,
    String refreshToken,
    UUID userId,
    String username,
    String tenantId,
    Role role
) {}
