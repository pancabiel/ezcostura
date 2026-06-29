package com.ezcostura.usuario.dto;

import jakarta.validation.constraints.NotNull;

/** Ativa ou desativa um usuário. */
public record UpdateUsuarioStatusRequest(
    @NotNull Boolean ativo
) {}
