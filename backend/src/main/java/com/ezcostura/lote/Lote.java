package com.ezcostura.lote;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.MappedCollection;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Table("lotes")
public class Lote implements Persistable<UUID> {

    @Id
    private UUID id;
    @Transient
    private boolean isNew = false;
    private String codigo;
    private String nome;
    private String descricao;
    private boolean finalizado;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    @MappedCollection(idColumn = "lote_id", keyColumn = "ordem")
    private List<Operacao> operacoes = new ArrayList<>();

    @MappedCollection(idColumn = "lote_id", keyColumn = "ordem")
    private List<Tamanho> tamanhos = new ArrayList<>();

    @Override
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    @Override
    public boolean isNew() { return isNew; }
    public void markNew() { this.isNew = true; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public boolean isFinalizado() { return finalizado; }
    public void setFinalizado(boolean finalizado) { this.finalizado = finalizado; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<Operacao> getOperacoes() { return operacoes; }
    public void setOperacoes(List<Operacao> operacoes) { this.operacoes = operacoes; }

    public List<Tamanho> getTamanhos() { return tamanhos; }
    public void setTamanhos(List<Tamanho> tamanhos) { this.tamanhos = tamanhos; }
}
