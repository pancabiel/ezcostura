package com.ezcostura.lote;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.util.UUID;

@Table("lote_operacoes")
public class Operacao {

    @Id
    private UUID id;
    private String nome;
    private int metaPorHora;

    public Operacao() {}

    public Operacao(UUID id, String nome, int metaPorHora) {
        this.id = id;
        this.nome = nome;
        this.metaPorHora = metaPorHora;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public int getMetaPorHora() { return metaPorHora; }
    public void setMetaPorHora(int metaPorHora) { this.metaPorHora = metaPorHora; }
}
