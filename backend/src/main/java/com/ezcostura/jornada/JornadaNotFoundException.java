package com.ezcostura.jornada;

import java.util.UUID;

public class JornadaNotFoundException extends RuntimeException {
    public JornadaNotFoundException(UUID id) {
        super("Jornada não encontrada: " + id);
    }
}
