package com.ezcostura.desempenho;

import com.ezcostura.alocacao.Alocacao;
import com.ezcostura.alocacao.AlocacaoRepository;
import com.ezcostura.ausencia.Ausencia;
import com.ezcostura.ausencia.AusenciaRepository;
import com.ezcostura.desempenho.dto.DesempenhoDiaDto;
import com.ezcostura.desempenho.dto.DesempenhoItemDto;
import com.ezcostura.desempenho.dto.DesempenhoPeriodoDto;
import com.ezcostura.desempenho.dto.MeuPackDto;
import com.ezcostura.desempenho.dto.PerfilDto;
import com.ezcostura.jornada.DiaEspecial;
import com.ezcostura.jornada.DiaEspecialRepository;
import com.ezcostura.jornada.Jornada;
import com.ezcostura.jornada.JornadaRepository;
import com.ezcostura.lote.Lote;
import com.ezcostura.lote.LoteRepository;
import com.ezcostura.lote.Operacao;
import com.ezcostura.operario.Operario;
import com.ezcostura.operario.OperarioNotFoundException;
import com.ezcostura.operario.OperarioRepository;
import com.ezcostura.pack.Pack;
import com.ezcostura.pack.PackRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Service
public class DesempenhoService {

    private static final LocalTime DEFAULT_SHIFT_START = LocalTime.of(7, 0);
    private static final LocalTime DEFAULT_SHIFT_END = LocalTime.of(18, 0);

    private final OperarioRepository operarioRepo;
    private final JornadaRepository jornadaRepo;
    private final DiaEspecialRepository diaEspecialRepo;
    private final AusenciaRepository ausenciaRepo;
    private final AlocacaoRepository alocacaoRepo;
    private final PackRepository packRepo;
    private final LoteRepository loteRepo;

    public DesempenhoService(OperarioRepository operarioRepo,
                             JornadaRepository jornadaRepo,
                             DiaEspecialRepository diaEspecialRepo,
                             AusenciaRepository ausenciaRepo,
                             AlocacaoRepository alocacaoRepo,
                             PackRepository packRepo,
                             LoteRepository loteRepo) {
        this.operarioRepo = operarioRepo;
        this.jornadaRepo = jornadaRepo;
        this.diaEspecialRepo = diaEspecialRepo;
        this.ausenciaRepo = ausenciaRepo;
        this.alocacaoRepo = alocacaoRepo;
        this.packRepo = packRepo;
        this.loteRepo = loteRepo;
    }

    @Transactional(readOnly = true)
    public PerfilDto perfil(UUID operarioId) {
        Operario op = operarioRepo.findById(operarioId)
            .orElseThrow(() -> new OperarioNotFoundException(operarioId));
        Jornada jornada = op.getJornadaId() != null
            ? jornadaRepo.findById(op.getJornadaId()).orElse(null)
            : null;
        return new PerfilDto(
            op.getId(),
            op.getNome(),
            mascararCpf(op.getCpf()),
            op.getDataAdmissao(),
            jornada != null ? jornada.getNome() : null
        );
    }

    /**
     * Packs individuais do próprio operário num dia, para a self-view do portal.
     * Ordenados por horário; o operário é sempre resolvido pelo JWT no controller,
     * nunca por parâmetro.
     */
    @Transactional(readOnly = true)
    public List<MeuPackDto> meusPacksDoDia(UUID operarioId, LocalDate data) {
        return packRepo.findByOperarioAndData(operarioId, data).stream()
            .map(p -> new MeuPackDto(
                p.getId(),
                p.getHorario(),
                p.getAlocacaoId(),
                p.getOperacaoId(),
                p.getOperacaoNome(),
                p.getLoteCodigo(),
                p.getTamanho(),
                p.getQuantidade()
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public DesempenhoDiaDto calcularDia(UUID operarioId, LocalDate data) {
        Operario op = operarioRepo.findById(operarioId)
            .orElseThrow(() -> new OperarioNotFoundException(operarioId));
        Jornada jornada = op.getJornadaId() != null
            ? jornadaRepo.findById(op.getJornadaId()).orElse(null)
            : null;
        List<DiaEspecial> diasEsp = diaEspecialRepo.findByDataOrderByCreatedAtAsc(data);
        List<Ausencia> ausencias = ausenciaRepo.findByOperarioAndPeriodo(operarioId, data, data);
        List<Alocacao> alocs = alocacaoRepo.findByOperarioAndData(operarioId, data);
        List<Pack> packs = packRepo.findByOperarioAndData(operarioId, data);
        Map<UUID, Lote> lotesPorId = carregarLotes(alocs);
        return montarDia(op, jornada, diasEsp, ausencias, alocs, packs, lotesPorId, data);
    }

    @Transactional(readOnly = true)
    public DesempenhoPeriodoDto calcularPeriodo(UUID operarioId, LocalDate inicio, LocalDate fim) {
        if (fim.isBefore(inicio)) throw new IllegalArgumentException("fim < inicio");
        Operario op = operarioRepo.findById(operarioId)
            .orElseThrow(() -> new OperarioNotFoundException(operarioId));
        Jornada jornada = op.getJornadaId() != null
            ? jornadaRepo.findById(op.getJornadaId()).orElse(null)
            : null;
        List<Ausencia> ausencias = ausenciaRepo.findByOperarioAndPeriodo(operarioId, inicio, fim);
        List<Alocacao> alocs = alocacaoRepo.findByDataBetween(inicio, fim).stream()
            .filter(a -> a.getOperarioId().equals(operarioId))
            .toList();
        List<Pack> packs = packRepo.findByDataBetween(inicio, fim).stream()
            .filter(p -> p.getOperarioId().equals(operarioId))
            .toList();
        Map<UUID, Lote> lotesPorId = carregarLotes(alocs);

        // dias_especiais: pego todos do range numa só varredura
        List<DiaEspecial> todosDiasEsp = StreamSupport
            .stream(diaEspecialRepo.findAll().spliterator(), false)
            .filter(d -> !d.getData().isBefore(inicio) && !d.getData().isAfter(fim))
            .toList();

        Map<LocalDate, List<Alocacao>> alocsPorData = alocs.stream()
            .collect(Collectors.groupingBy(Alocacao::getData));
        Map<LocalDate, List<Pack>> packsPorData = packs.stream()
            .collect(Collectors.groupingBy(Pack::getData));
        Map<LocalDate, List<DiaEspecial>> espPorData = todosDiasEsp.stream()
            .collect(Collectors.groupingBy(DiaEspecial::getData));

        List<DesempenhoDiaDto> dias = new ArrayList<>();
        LocalDate cur = inicio;
        while (!cur.isAfter(fim)) {
            DesempenhoDiaDto d = montarDia(
                op, jornada,
                espPorData.getOrDefault(cur, List.of()),
                ausencias,
                alocsPorData.getOrDefault(cur, List.of()),
                packsPorData.getOrDefault(cur, List.of()),
                lotesPorId,
                cur
            );
            dias.add(d);
            cur = cur.plusDays(1);
        }
        int totalMeta = dias.stream().mapToInt(DesempenhoDiaDto::totalMeta).sum();
        int totalProd = dias.stream().mapToInt(DesempenhoDiaDto::totalProduzido).sum();
        // Média das % dos dias com meta > 0 (coerente com o cálculo do dia, que é média das
        // % por operação) — não ponderado por produção, conforme pedido do cliente.
        double totalPct = round2(dias.stream()
            .filter(d -> d.totalMeta() > 0)
            .mapToDouble(DesempenhoDiaDto::totalPct)
            .average()
            .orElse(0.0));
        return new DesempenhoPeriodoDto(inicio, fim, dias, totalMeta, totalProd, totalPct);
    }

    private DesempenhoDiaDto montarDia(
        Operario op,
        Jornada jornada,
        List<DiaEspecial> diasEsp,
        List<Ausencia> ausenciasOperario,
        List<Alocacao> alocs,
        List<Pack> packs,
        Map<UUID, Lote> lotesPorId,
        LocalDate data
    ) {
        JornadaEfetiva ef = JornadaResolver.resolver(op.getId(), data, jornada, diasEsp);
        LocalTime inicioJornada = ef != null ? ef.horaInicio() : DEFAULT_SHIFT_START;
        LocalTime fimJornada = ef != null ? ef.horaFim() : DEFAULT_SHIFT_END;
        boolean ausente = ausenciasOperario.stream().anyMatch(a ->
            !data.isBefore(a.getDataInicio()) && !data.isAfter(a.getDataFim())
        );

        Map<UUID, Integer> packsPorAlocacao = packs.stream()
            .collect(Collectors.groupingBy(Pack::getAlocacaoId, Collectors.summingInt(Pack::getQuantidade)));

        List<Alocacao> sorted = alocs.stream()
            .sorted(Comparator.comparing(Alocacao::getHorarioInicio))
            .toList();

        int shiftStart = toMin(inicioJornada);
        int shiftEnd = toMin(fimJornada);
        List<int[]> pausasMin = ef != null
            ? ef.pausas().stream().map(p -> new int[]{toMin(p.horaInicio()), toMin(p.horaFim())}).toList()
            : List.of();

        List<DesempenhoItemDto> itens = new ArrayList<>();
        int totalMeta = 0;
        int totalProd = 0;
        List<Double> pcts = new ArrayList<>();

        for (int i = 0; i < sorted.size(); i++) {
            Alocacao a = sorted.get(i);
            int rawStart = toMin(a.getHorarioInicio());
            int rawEnd = i + 1 < sorted.size()
                ? toMin(sorted.get(i + 1).getHorarioInicio())
                : shiftEnd;
            int startMin = Math.max(rawStart, shiftStart);
            int endMin = Math.min(rawEnd, shiftEnd);
            int span = Math.max(0, endMin - startMin);
            int pausaOverlap = 0;
            for (int[] p : pausasMin) pausaOverlap += overlapMin(startMin, endMin, p[0], p[1]);
            int workingMin = ausente ? 0 : Math.max(0, span - pausaOverlap);
            double horas = workingMin / 60.0;

            Lote lote = lotesPorId.get(a.getLoteId());
            Operacao operacao = lote != null
                ? lote.getOperacoes().stream().filter(o -> o.getId().equals(a.getOperacaoId())).findFirst().orElse(null)
                : null;
            int metaHora = operacao != null ? operacao.getMetaPorHora() : 0;
            int meta = (int) Math.round(metaHora * horas);
            int produzido = packsPorAlocacao.getOrDefault(a.getId(), 0);
            double pct = meta > 0 ? round2((double) produzido / meta * 100.0) : 0.0;

            itens.add(new DesempenhoItemDto(
                a.getId(),
                a.getLoteId(),
                lote != null ? lote.getCodigo() : null,
                a.getOperacaoId(),
                operacao != null ? operacao.getNome() : null,
                metaHora,
                a.getHorarioInicio().toString().substring(0, 5),
                round1(horas),
                meta,
                produzido,
                pct
            ));
            totalMeta += meta;
            totalProd += produzido;
            if (meta > 0) pcts.add(pct);
        }

        double totalPct = pcts.isEmpty()
            ? 0.0
            : round2(pcts.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));

        String origem = ef != null ? ef.origem().name() : "DEFAULT";
        return new DesempenhoDiaDto(
            data,
            ausente,
            origem,
            inicioJornada.toString().substring(0, 5),
            fimJornada.toString().substring(0, 5),
            itens,
            totalMeta,
            totalProd,
            totalPct
        );
    }

    private Map<UUID, Lote> carregarLotes(List<Alocacao> alocs) {
        List<UUID> ids = alocs.stream().map(Alocacao::getLoteId).distinct().toList();
        Map<UUID, Lote> map = new HashMap<>();
        for (UUID id : ids) loteRepo.findById(id).ifPresent(l -> map.put(id, l));
        return map;
    }

    private static int toMin(LocalTime t) {
        return t.getHour() * 60 + t.getMinute();
    }

    private static int overlapMin(int a1, int a2, int b1, int b2) {
        return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private static String mascararCpf(String cpf) {
        if (cpf == null || cpf.length() < 11) return cpf;
        String d = cpf.replaceAll("\\D", "");
        if (d.length() != 11) return cpf;
        return "***." + d.substring(3, 6) + "." + d.substring(6, 9) + "-**";
    }
}
