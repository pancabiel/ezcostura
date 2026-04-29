package com.ezcostura.operario;

import java.util.UUID;

public class OperarioNotFoundException extends RuntimeException {
    public OperarioNotFoundException(UUID id) {
        super("Operário não encontrado: " + id);
    }
}
