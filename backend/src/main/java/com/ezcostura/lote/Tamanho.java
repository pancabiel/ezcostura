package com.ezcostura.lote;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.MappedCollection;
import org.springframework.data.relational.core.mapping.Table;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Table("lote_tamanhos")
public class Tamanho {

    @Id
    private UUID id;
    private String tamanho;
    private int quantidade;

    /**
     * Células da matriz para este tamanho — uma por tonalidade compartilhada do lote.
     * Vazia quando o lote não trabalha com tonalidades. O total ({@code quantidade}) é
     * a soma destas quando há tonalidades.
     */
    @MappedCollection(idColumn = "tamanho_id", keyColumn = "ordem")
    private List<TamanhoTonalidade> tonalidades = new ArrayList<>();

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

    public List<TamanhoTonalidade> getTonalidades() { return tonalidades; }
    public void setTonalidades(List<TamanhoTonalidade> tonalidades) { this.tonalidades = tonalidades; }
}
