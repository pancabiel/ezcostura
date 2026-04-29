package com.ezcostura.jornada;

import com.ezcostura.config.ReactiveTenantHelper;
import com.ezcostura.jornada.dto.ConfiguracaoJornadaDto;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/configuracao-jornada")
public class ConfiguracaoJornadaController {

    private final ConfiguracaoJornadaService service;

    public ConfiguracaoJornadaController(ConfiguracaoJornadaService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
    public Mono<ConfiguracaoJornadaDto> get() {
        return ReactiveTenantHelper.runBlocking(service::get);
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<ConfiguracaoJornadaDto> update(@Valid @RequestBody ConfiguracaoJornadaDto dto) {
        return ReactiveTenantHelper.runBlocking(() -> service.update(dto));
    }
}
