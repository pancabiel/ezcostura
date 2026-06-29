package com.ezcostura.usuario.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Admin redefine a senha de um usuário (sem precisar da senha atual). */
public record ResetPasswordRequest(
    @NotBlank @Size(min = 8, message = "A senha deve ter pelo menos 8 caracteres") String newPassword
) {}
