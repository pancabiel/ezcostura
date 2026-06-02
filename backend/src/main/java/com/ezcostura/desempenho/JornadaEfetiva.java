package com.ezcostura.desempenho;

import com.ezcostura.jornada.TipoPausa;

import java.time.LocalTime;
import java.util.List;

/**
 * Jornada resolvida para um operário num dia específico, depois de aplicar
 * dia-especial / override de dia da semana / horário padrão da jornada.
 */
public record JornadaEfetiva(
    LocalTime horaInicio,
    LocalTime horaFim,
    List<PausaEfetiva> pausas,
    Origem origem
) {
    public enum Origem { PADRAO, DIA_SEMANA, DIA_ESPECIAL }

    public record PausaEfetiva(String nome, LocalTime horaInicio, LocalTime horaFim, TipoPausa tipo) {}
}
