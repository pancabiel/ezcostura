package com.ezcostura.alocacao;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Table("alocacoes")
public class Alocacao implements Persistable<UUID> {

    @Id
    private UUID id;
    @Transient
    private boolean isNew = false;
    private UUID operarioId;
    private LocalDate data;
    private LocalTime horarioInicio;
    private UUID loteId;
    private String tamanho;
    private UUID operacaoId;
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

    public LocalTime getHorarioInicio() { return horarioInicio; }
    public void setHorarioInicio(LocalTime horarioInicio) { this.horarioInicio = horarioInicio; }

    public UUID getLoteId() { return loteId; }
    public void setLoteId(UUID loteId) { this.loteId = loteId; }

    public String getTamanho() { return tamanho; }
    public void setTamanho(String tamanho) { this.tamanho = tamanho; }

    public UUID getOperacaoId() { return operacaoId; }
    public void setOperacaoId(UUID operacaoId) { this.operacaoId = operacaoId; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
