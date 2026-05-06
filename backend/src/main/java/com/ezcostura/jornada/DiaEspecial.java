package com.ezcostura.jornada;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.MappedCollection;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Table("dias_especiais")
public class DiaEspecial implements Persistable<UUID> {

    @Id
    private UUID id;
    @Transient
    private boolean isNew = false;
    private LocalDate data;
    private String descricao;
    private LocalTime horaInicio;
    private LocalTime horaFim;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    @MappedCollection(idColumn = "dia_especial_id", keyColumn = "ordem")
    private List<DiaEspecialPausa> pausas = new ArrayList<>();

    @MappedCollection(idColumn = "dia_especial_id")
    private List<DiaEspecialOperario> operarios = new ArrayList<>();

    @Override
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    @Override
    public boolean isNew() { return isNew; }
    public void markNew() { this.isNew = true; }

    public LocalDate getData() { return data; }
    public void setData(LocalDate data) { this.data = data; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public LocalTime getHoraInicio() { return horaInicio; }
    public void setHoraInicio(LocalTime horaInicio) { this.horaInicio = horaInicio; }

    public LocalTime getHoraFim() { return horaFim; }
    public void setHoraFim(LocalTime horaFim) { this.horaFim = horaFim; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<DiaEspecialPausa> getPausas() { return pausas; }
    public void setPausas(List<DiaEspecialPausa> pausas) { this.pausas = pausas; }

    public List<DiaEspecialOperario> getOperarios() { return operarios; }
    public void setOperarios(List<DiaEspecialOperario> operarios) { this.operarios = operarios; }
}
