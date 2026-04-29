package com.ezcostura.lote;

import java.util.UUID;

public class LoteNotFoundException extends RuntimeException {
    public LoteNotFoundException(UUID id) {
        super("Lote não encontrado: " + id);
    }
}
