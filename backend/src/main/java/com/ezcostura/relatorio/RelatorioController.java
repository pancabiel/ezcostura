package com.ezcostura.relatorio;

import com.ezcostura.config.ReactiveTenantHelper;
import com.ezcostura.pack.PackRepository;
import com.ezcostura.relatorio.dto.ProducaoLoteDto;
import com.ezcostura.relatorio.dto.ProducaoOperarioDiaDto;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/relatorios")
@PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
public class RelatorioController {

    private final PackRepository packRepository;

    public RelatorioController(PackRepository packRepository) {
        this.packRepository = packRepository;
    }

    @GetMapping("/producao-operario-dia")
    public Mono<List<ProducaoOperarioDiaDto>> producaoPorOperarioDia(
        @RequestParam("inicio") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
        @RequestParam("fim") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim
    ) {
        return ReactiveTenantHelper.runBlocking(() ->
            packRepository.producaoPorOperarioDia(inicio, fim).stream()
                .map(p -> new ProducaoOperarioDiaDto(p.operarioId(), p.data(), p.total()))
                .toList()
        );
    }

    @GetMapping("/producao-lote")
    public Mono<List<ProducaoLoteDto>> producaoPorLote(
        @RequestParam("inicio") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
        @RequestParam("fim") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim
    ) {
        return ReactiveTenantHelper.runBlocking(() ->
            packRepository.producaoPorLote(inicio, fim).stream()
                .map(p -> new ProducaoLoteDto(p.loteId(), p.total()))
                .toList()
        );
    }
}
