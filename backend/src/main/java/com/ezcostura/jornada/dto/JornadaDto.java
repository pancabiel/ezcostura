package com.ezcostura.jornada.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record JornadaDto(
    UUID id,
    @NotBlank @Size(max = 80) String nome,
    @NotNull LocalTime horaInicio,
    @NotNull LocalTime horaFim,
    @Valid List<PausaDto> pausas,
    @Valid List<DiaSemanaOverrideDto> diasSemana,
    OffsetDateTime updatedAt
) {}
