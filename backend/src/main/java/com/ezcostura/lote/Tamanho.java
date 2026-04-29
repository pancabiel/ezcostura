package com.ezcostura.lote;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.util.UUID;

@Table("lote_tamanhos")
public class Tamanho {

    @Id
    private UUID id;
    private String tamanho;
    private int quantidade;

    public Tamanho() {}

    public Tamanho(UUID id, String tamanho, int quantidade) {
        this.id = id;
        this.tamanho = tamanho;
        this.quantidade = quantidade;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTamanho() { return tamanho; }
    public void setTamanho(String tamanho) { this.tamanho = tamanho; }

    public int getQuantidade() { return quantidade; }
    public void setQuantidade(int quantidade) { this.quantidade = quantidade; }
}
