package com.ezcostura.jornada.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ConfiguracaoJornadaDto(
    UUID id,
    @NotNull LocalTime horaInicio,
    @NotNull LocalTime horaFim,
    @Valid List<PausaDto> pausas,
    OffsetDateTime updatedAt
) {}
