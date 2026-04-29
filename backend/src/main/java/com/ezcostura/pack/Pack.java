package com.ezcostura.pack;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Table("packs")
public class Pack implements Persistable<UUID> {

    @Id
    private UUID id;
    @Transient
    private boolean isNew = false;
    private UUID operarioId;
    private LocalDate data;
    private OffsetDateTime horario;
    private UUID alocacaoId;
    private int quantidade;
    private UUID registradoPor;
    private OffsetDateTime createdAt;

    @Override
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    @Override
    public boolean isNew() { return isNew; }
    public void markNew() { this.isNew = true; }

    public UUID getOperarioId() { return operarioId; }
    public void setOperarioId(UUID operarioId) { this.operarioId = operarioId; }

    public LocalDate getData() { return data; }
    public void setData(LocalDate data) { this.data = data; }

    public OffsetDateTime getHorario() { return horario; }
    public void setHorario(OffsetDateTime horario) { this.horario = horario; }

    public UUID getAlocacaoId() { return alocacaoId; }
    public void setAlocacaoId(UUID alocacaoId) { this.alocacaoId = alocacaoId; }

    public int getQuantidade() { return quantidade; }
    public void setQuantidade(int quantidade) { this.quantidade = quantidade; }

    public UUID getRegistradoPor() { return registradoPor; }
    public void setRegistradoPor(UUID registradoPor) { this.registradoPor = registradoPor; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
