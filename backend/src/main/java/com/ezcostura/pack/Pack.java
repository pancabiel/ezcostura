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
    private UUID loteId;
    private UUID operacaoId;
    private String loteCodigo;
    private String operacaoNome;
    private int quantidade;
    private String tamanho;
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

    public UUID getLoteId() { return loteId; }
    public void setLoteId(UUID loteId) { this.loteId = loteId; }

    public UUID getOperacaoId() { return operacaoId; }
    public void setOperacaoId(UUID operacaoId) { this.operacaoId = operacaoId; }

    public String getLoteCodigo() { return loteCodigo; }
    public void setLoteCodigo(String loteCodigo) { this.loteCodigo = loteCodigo; }

    public String getOperacaoNome() { return operacaoNome; }
    public void setOperacaoNome(String operacaoNome) { this.operacaoNome = operacaoNome; }

    public int getQuantidade() { return quantidade; }
    public void setQuantidade(int quantidade) { this.quantidade = quantidade; }

    public String getTamanho() { return tamanho; }
    public void setTamanho(String tamanho) { this.tamanho = tamanho; }

    public UUID getRegistradoPor() { return registradoPor; }
    public void setRegistradoPor(UUID registradoPor) { this.registradoPor = registradoPor; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
