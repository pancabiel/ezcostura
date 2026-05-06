package com.ezcostura.jornada.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;
import java.util.UUID;

public record DiaSemanaOverrideDto(
    UUID id,
    @NotNull @Min(0) @Max(6) Integer diaSemana,
    @NotNull LocalTime horaInicio,
    @NotNull LocalTime horaFim
) {}
