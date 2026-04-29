package com.ezcostura.lote;

import com.ezcostura.config.ReactiveTenantHelper;
import com.ezcostura.lote.dto.LoteDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lotes")
@PreAuthorize("hasRole('ADMIN')")
public class LoteController {

    private final LoteService service;

    public LoteController(LoteService service) {
        this.service = service;
    }

    @GetMapping
    public Mono<List<LoteDto>> findAll() {
        return ReactiveTenantHelper.runBlocking(service::findAll);
    }

    @GetMapping("/{id}")
    public Mono<LoteDto> findById(@PathVariable UUID id) {
        return ReactiveTenantHelper.runBlocking(() -> service.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<LoteDto> create(@Valid @RequestBody LoteDto dto) {
        return ReactiveTenantHelper.runBlocking(() -> service.create(dto));
    }

    @PutMapping("/{id}")
    public Mono<LoteDto> update(@PathVariable UUID id, @Valid @RequestBody LoteDto dto) {
        return ReactiveTenantHelper.runBlocking(() -> service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<Void>> delete(@PathVariable UUID id) {
        return ReactiveTenantHelper.runBlocking(() -> {
            service.delete(id);
            return ResponseEntity.noContent().<Void>build();
        });
    }
}
