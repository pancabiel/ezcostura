package com.ezcostura.jornada;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.util.UUID;

@Table("dia_especial_operarios")
public class DiaEspecialOperario {

    @Id
    private UUID id;
    private UUID operarioId;

    public DiaEspecialOperario() {}

    public DiaEspecialOperario(UUID id, UUID operarioId) {
        this.id = id;
        this.operarioId = operarioId;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOperarioId() { return operarioId; }
    public void setOperarioId(UUID operarioId) { this.operarioId = operarioId; }
}
