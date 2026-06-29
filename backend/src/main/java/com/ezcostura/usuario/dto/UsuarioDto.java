package com.ezcostura.usuario.dto;

import com.ezcostura.auth.Role;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Visão de leitura de um usuário de login — nunca expõe o hash da senha. */
public record UsuarioDto(
    UUID id,
    String username,
    Role role,
    boolean ativo,
    OffsetDateTime createdAt
) {}
