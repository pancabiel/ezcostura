package com.ezcostura.jornada.dto;

import com.ezcostura.jornada.TipoPausa;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;
import java.util.UUID;

public record PausaDto(
    UUID id,
    @Size(max = 50) String nome,
    @NotNull LocalTime horaInicio,
    @NotNull LocalTime horaFim,
    @NotNull TipoPausa tipo,
    /** null = pausa padrão; 0..6 = pausa específica daquele dia da semana (domingo=0). */
    @Min(0) @Max(6) Integer diaSemana
) {}
