package com.ezcostura.auth;

import java.util.UUID;

public record AuthenticatedPrincipal(UUID userId, String tenantId, Role role) {}
