package com.ezcostura.pack;

import com.ezcostura.config.ReactiveTenantHelper;
import com.ezcostura.pack.dto.PackDto;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
@RequestMapping("/api/packs")
@PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
public class PackController {

    private final PackService service;

    public PackController(PackService service) {
        this.service = service;
    }

    @GetMapping
    public Mono<List<PackDto>> findByData(
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
        return ReactiveTenantHelper.runBlocking(() -> service.findByData(data, operarioId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<PackDto> create(@Valid @RequestBody PackDto dto) {
        return ReactiveTenantHelper.runBlocking(() -> service.create(dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<ResponseEntity<Void>> delete(@PathVariable UUID id) {
        return ReactiveTenantHelper.runBlocking(() -> {
            service.delete(id);
            return ResponseEntity.noContent().<Void>build();
        });
    }
}
