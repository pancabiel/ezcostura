package com.ezcostura.jornada;

import java.util.UUID;

public class DiaEspecialNotFoundException extends RuntimeException {
    public DiaEspecialNotFoundException(UUID id) {
        super("Dia especial não encontrado: " + id);
    }
}
