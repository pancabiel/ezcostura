package com.ezcostura.usuario;

import java.util.UUID;

public class UsuarioNotFoundException extends RuntimeException {
    public UsuarioNotFoundException(UUID id) {
        super("Usuário não encontrado: " + id);
    }
}
