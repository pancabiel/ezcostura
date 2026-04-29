package com.ezcostura.pack;

import java.util.UUID;

public class PackNotFoundException extends RuntimeException {
    public PackNotFoundException(UUID id) {
        super("Pack não encontrado: " + id);
    }
}
