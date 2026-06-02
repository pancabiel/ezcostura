package com.ezcostura.operario;

import com.ezcostura.auth.dto.SetPinRequest;
import com.ezcostura.config.ReactiveTenantHelper;
import com.ezcostura.operario.dto.OperarioDto;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/operarios")
@PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
public class OperarioController {

    private final OperarioService service;

    public OperarioController(OperarioService service) {
        this.service = service;
    }

    @GetMapping
    public Mono<List<OperarioDto>> findAll(@RequestParam(value = "ativo", required = false) Boolean ativo) {
        return ReactiveTenantHelper.runBlocking(() -> service.findAll(ativo));
    }

    @GetMapping("/{id}")
    public Mono<OperarioDto> findById(@PathVariable UUID id) {
        return ReactiveTenantHelper.runBlocking(() -> service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<OperarioDto> create(@Valid @RequestBody OperarioDto dto) {
        return ReactiveTenantHelper.runBlocking(() -> service.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<OperarioDto> update(@PathVariable UUID id, @Valid @RequestBody OperarioDto dto) {
        return ReactiveTenantHelper.runBlocking(() -> service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<ResponseEntity<Void>> delete(@PathVariable UUID id) {
        return ReactiveTenantHelper.runBlocking(() -> {
            service.delete(id);
            return ResponseEntity.noContent().<Void>build();
        });
    }

    @PostMapping("/{id}/pin")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> setPin(@PathVariable UUID id, @Valid @RequestBody SetPinRequest request) {
        return ReactiveTenantHelper.runBlocking(() -> {
            service.setPin(id, request.pin());
            return null;
        });
    }

    @DeleteMapping("/{id}/pin")
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<ResponseEntity<Void>> removePin(@PathVariable UUID id) {
        return ReactiveTenantHelper.runBlocking(() -> {
            service.removePin(id);
            return ResponseEntity.noContent().<Void>build();
        });
    }
}
