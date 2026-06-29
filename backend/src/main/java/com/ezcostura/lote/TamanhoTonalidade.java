package com.ezcostura.lote;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.util.UUID;

/**
 * Célula da matriz tamanho × tonalidade: a quantidade de uma tonalidade dentro de
 * um tamanho. Filha de {@link Tamanho} no agregado do lote. A tonalidade é guardada
 * pelo nome (string), espelhando o conjunto compartilhado em {@link Tonalidade}.
 */
@Table("lote_tamanho_tonalidades")
public class TamanhoTonalidade {

    @Id
    private UUID id;
    private String tonalidade;
    private int quantidade;

    public TamanhoTonalidade() {}

    public TamanhoTonalidade(UUID id, String tonalidade, int quantidade) {
        this.id = id;
        this.tonalidade = tonalidade;
        this.quantidade = quantidade;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTonalidade() { return tonalidade; }
    public void setTonalidade(String tonalidade) { this.tonalidade = tonalidade; }

    public int getQuantidade() { return quantidade; }
    public void setQuantidade(int quantidade) { this.quantidade = quantidade; }
}
