package com.ezcostura.ausencia;

import java.util.UUID;

public class AusenciaNotFoundException extends RuntimeException {
    public AusenciaNotFoundException(UUID id) {
        super("Ausência não encontrada: " + id);
    }
}
