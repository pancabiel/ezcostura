package com.ezcostura.desempenho.dto;

import java.time.LocalDate;
import java.util.UUID;

public record PerfilDto(
    UUID operarioId,
    String nome,
    String cpfMascarado,
    LocalDate dataAdmissao,
    String jornadaNome
) {}
