package com.ezcostura.jornada;

import com.ezcostura.config.ReactiveTenantHelper;
import com.ezcostura.jornada.dto.DiaEspecialDto;
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
@RequestMapping("/api/dias-especiais")
public class DiaEspecialController {

    private final DiaEspecialService service;

    public DiaEspecialController(DiaEspecialService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'SUPERVISOR', 'OPERADOR')")
    public Mono<List<DiaEspecialDto>> findAll() {
        return ReactiveTenantHelper.runBlocking(service::findAll);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<DiaEspecialDto> create(@Valid @RequestBody DiaEspecialDto dto) {
        return ReactiveTenantHelper.runBlocking(() -> service.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    public Mono<DiaEspecialDto> update(@PathVariable UUID id, @Valid @RequestBody DiaEspecialDto dto) {
        return ReactiveTenantHelper.runBlocking(() -> service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    public Mono<ResponseEntity<Void>> delete(@PathVariable UUID id) {
        return ReactiveTenantHelper.runBlocking(() -> {
            service.delete(id);
            return ResponseEntity.noContent().<Void>build();
        });
    }
}
