package com.ezcostura.jornada.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record DiaEspecialDto(
    UUID id,
    @NotNull LocalDate data,
    @Size(max = 120) String descricao,
    @NotNull LocalTime horaInicio,
    @NotNull LocalTime horaFim,
    @Valid List<DiaEspecialPausaDto> pausas,
    @NotNull List<UUID> operarioIds,
    OffsetDateTime updatedAt
) {}
