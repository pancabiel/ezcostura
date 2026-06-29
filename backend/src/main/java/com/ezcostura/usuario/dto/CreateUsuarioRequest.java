package com.ezcostura.usuario.dto;

import com.ezcostura.auth.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Criação de usuário pelo admin. O {@code role} é validado no serviço:
 * só GERENTE ou SUPERVISOR são aceitos (admin não cria outros admins).
 */
public record CreateUsuarioRequest(
    @NotBlank @Size(max = 64, message = "Usuário deve ter no máximo 64 caracteres") String username,
    @NotNull(message = "Selecione o tipo de usuário") Role role,
    @NotBlank @Size(min = 8, message = "A senha deve ter pelo menos 8 caracteres") String password
) {}
