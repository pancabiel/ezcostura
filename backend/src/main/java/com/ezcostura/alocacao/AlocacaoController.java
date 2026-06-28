package com.ezcostura.alocacao;

import com.ezcostura.alocacao.dto.AlocacaoDto;
import com.ezcostura.auth.AuthenticatedPrincipal;
import com.ezcostura.auth.Role;
import com.ezcostura.config.ReactiveTenantHelper;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/alocacoes")
@PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
public class AlocacaoController {

    private final AlocacaoService service;

    public AlocacaoController(AlocacaoService service) {
        this.service = service;
    }

    @GetMapping
    public Mono<List<AlocacaoDto>> findByData(
        @RequestParam(value = "data", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data,
        @RequestParam(value = "inicio", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
        @RequestParam(value = "fim", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
        @RequestParam(value = "operarioId", required = false) UUID operarioId
    ) {
        if (inicio != null && fim != null) {
            return ReactiveTenantHelper.runBlocking(() -> service.findByDataBetween(inicio, fim));
        }
        if (data == null) {
            throw new IllegalArgumentException("Informe 'data' ou ('inicio' e 'fim').");
        }
        if (operarioId != null) {
            return ReactiveTenantHelper.runBlocking(() -> service.findByOperarioAndData(operarioId, data));
        }
        return ReactiveTenantHelper.runBlocking(() -> service.findByData(data));
    }

    @GetMapping("/{id}")
    public Mono<AlocacaoDto> findById(@PathVariable UUID id) {
        return ReactiveTenantHelper.runBlocking(() -> service.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<AlocacaoDto> create(
        @Valid @RequestBody AlocacaoDto dto,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        Role autor = principal != null ? principal.role() : null;
        return ReactiveTenantHelper.runBlocking(() -> service.create(dto, autor));
    }

    @PutMapping("/{id}")
    public Mono<AlocacaoDto> update(
        @PathVariable UUID id,
        @Valid @RequestBody AlocacaoDto dto,
        @AuthenticationPrincipal AuthenticatedPrincipal principal
    ) {
        Role autor = principal != null ? principal.role() : null;
        return ReactiveTenantHelper.runBlocking(() -> service.update(id, dto, autor));
    }

    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<Void>> delete(@PathVariable UUID id) {
        return ReactiveTenantHelper.runBlocking(() -> {
            service.delete(id);
            return ResponseEntity.noContent().<Void>build();
        });
    }
}
