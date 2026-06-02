package com.ezcostura.desempenho;

import com.ezcostura.jornada.DiaEspecial;
import com.ezcostura.jornada.DiaEspecialOperario;
import com.ezcostura.jornada.DiaEspecialPausa;
import com.ezcostura.jornada.Jornada;
import com.ezcostura.jornada.JornadaDiaSemana;
import com.ezcostura.jornada.Pausa;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Porte 1:1 de {@code resolverJornadaEfetiva} do frontend (jornadaRepo.ts).
 * Prioridade: dia especial cujo conjunto de operarios contém o operário
 * → override de dia da semana → padrão da jornada.
 */
public final class JornadaResolver {

    private JornadaResolver() {}

    public static JornadaEfetiva resolver(
        UUID operarioId,
        LocalDate data,
        Jornada jornadaDoOperario,
        List<DiaEspecial> diasEspeciais
    ) {
        // 1. Dia especial que cobre esse operário tem prioridade máxima.
        for (DiaEspecial de : diasEspeciais) {
            if (!de.getData().equals(data)) continue;
            boolean cobre = de.getOperarios().stream()
                .map(DiaEspecialOperario::getOperarioId)
                .anyMatch(operarioId::equals);
            if (!cobre) continue;
            List<JornadaEfetiva.PausaEfetiva> pausas = de.getPausas().stream()
                .map(JornadaResolver::toEfetiva)
                .toList();
            return new JornadaEfetiva(
                de.getHoraInicio(),
                de.getHoraFim(),
                pausas,
                JornadaEfetiva.Origem.DIA_ESPECIAL
            );
        }

        if (jornadaDoOperario == null) return null;

        // 2. Override por dia da semana (frontend usa 0=domingo .. 6=sábado).
        int dow = toJsDayOfWeek(data);
        JornadaDiaSemana override = jornadaDoOperario.getDiasSemana().stream()
            .filter(d -> d.getDiaSemana() != null && d.getDiaSemana() == dow)
            .findFirst()
            .orElse(null);

        var horaInicio = override != null ? override.getHoraInicio() : jornadaDoOperario.getHoraInicio();
        var horaFim = override != null ? override.getHoraFim() : jornadaDoOperario.getHoraFim();
        var origem = override != null ? JornadaEfetiva.Origem.DIA_SEMANA : JornadaEfetiva.Origem.PADRAO;

        // 3. Pausas: se houver pausas específicas para o dia da semana, usa só elas;
        //    caso contrário, usa as pausas padrão (diaSemana == null).
        List<Pausa> pausasDoDia = jornadaDoOperario.getPausas().stream()
            .filter(p -> p.getDiaSemana() != null && p.getDiaSemana() == dow)
            .toList();
        List<Pausa> pausasPadrao = jornadaDoOperario.getPausas().stream()
            .filter(p -> p.getDiaSemana() == null)
            .toList();
        List<Pausa> pausasFinais = pausasDoDia.isEmpty() ? pausasPadrao : pausasDoDia;

        List<JornadaEfetiva.PausaEfetiva> pausasEf = pausasFinais.stream()
            .map(JornadaResolver::toEfetiva)
            .toList();

        return new JornadaEfetiva(horaInicio, horaFim, pausasEf, origem);
    }

    private static JornadaEfetiva.PausaEfetiva toEfetiva(Pausa p) {
        return new JornadaEfetiva.PausaEfetiva(p.getNome(), p.getHoraInicio(), p.getHoraFim(), p.getTipo());
    }

    private static JornadaEfetiva.PausaEfetiva toEfetiva(DiaEspecialPausa p) {
        return new JornadaEfetiva.PausaEfetiva(p.getNome(), p.getHoraInicio(), p.getHoraFim(), p.getTipo());
    }

    /** JS getDay(): 0=domingo..6=sábado. Java DayOfWeek: MONDAY=1..SUNDAY=7. */
    private static int toJsDayOfWeek(LocalDate data) {
        DayOfWeek d = data.getDayOfWeek();
        return d == DayOfWeek.SUNDAY ? 0 : d.getValue();
    }
}
