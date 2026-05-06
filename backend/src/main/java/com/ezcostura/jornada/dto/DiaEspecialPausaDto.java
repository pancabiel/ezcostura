package com.ezcostura.jornada.dto;

import com.ezcostura.jornada.TipoPausa;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;
import java.util.UUID;

public record DiaEspecialPausaDto(
    UUID id,
    @Size(max = 50) String nome,
    @NotNull LocalTime horaInicio,
    @NotNull LocalTime horaFim,
    @NotNull TipoPausa tipo
) {}
