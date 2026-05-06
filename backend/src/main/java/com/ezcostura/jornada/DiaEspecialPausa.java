package com.ezcostura.jornada;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalTime;
import java.util.UUID;

@Table("dia_especial_pausas")
public class DiaEspecialPausa {

    @Id
    private UUID id;
    private String nome;
    private LocalTime horaInicio;
    private LocalTime horaFim;
    private TipoPausa tipo;

    public DiaEspecialPausa() {}

    public DiaEspecialPausa(UUID id, String nome, LocalTime horaInicio, LocalTime horaFim, TipoPausa tipo) {
        this.id = id;
        this.nome = nome;
        this.horaInicio = horaInicio;
        this.horaFim = horaFim;
        this.tipo = tipo;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public LocalTime getHoraInicio() { return horaInicio; }
    public void setHoraInicio(LocalTime horaInicio) { this.horaInicio = horaInicio; }

    public LocalTime getHoraFim() { return horaFim; }
    public void setHoraFim(LocalTime horaFim) { this.horaFim = horaFim; }

    public TipoPausa getTipo() { return tipo; }
    public void setTipo(TipoPausa tipo) { this.tipo = tipo; }
}
