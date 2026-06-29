package com.ezcostura.lote;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.util.UUID;

/** Nome de tonalidade compartilhado pelo lote (coluna da matriz). Sem quantidade. */
@Table("lote_tonalidades")
public class Tonalidade {

    @Id
    private UUID id;
    private String tonalidade;

    public Tonalidade() {}

    public Tonalidade(UUID id, String tonalidade) {
        this.id = id;
        this.tonalidade = tonalidade;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTonalidade() { return tonalidade; }
    public void setTonalidade(String tonalidade) { this.tonalidade = tonalidade; }
}
