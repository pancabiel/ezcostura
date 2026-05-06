package com.ezcostura.jornada;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalTime;
import java.util.UUID;

@Table("jornada_dia_semana")
public class JornadaDiaSemana {

    @Id
    private UUID id;
    /** 0 = domingo .. 6 = sábado. */
    private Integer diaSemana;
    private LocalTime horaInicio;
    private LocalTime horaFim;

    public JornadaDiaSemana() {}

    public JornadaDiaSemana(UUID id, Integer diaSemana, LocalTime horaInicio, LocalTime horaFim) {
        this.id = id;
        this.diaSemana = diaSemana;
        this.horaInicio = horaInicio;
        this.horaFim = horaFim;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Integer getDiaSemana() { return diaSemana; }
    public void setDiaSemana(Integer diaSemana) { this.diaSemana = diaSemana; }

    public LocalTime getHoraInicio() { return horaInicio; }
    public void setHoraInicio(LocalTime horaInicio) { this.horaInicio = horaInicio; }

    public LocalTime getHoraFim() { return horaFim; }
    public void setHoraFim(LocalTime horaFim) { this.horaFim = horaFim; }
}
