package com.ezcostura.alocacao;

import java.util.UUID;

public class AlocacaoNotFoundException extends RuntimeException {
    public AlocacaoNotFoundException(UUID id) {
        super("Alocação não encontrada: " + id);
    }
}
