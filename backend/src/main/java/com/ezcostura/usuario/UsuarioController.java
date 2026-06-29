package com.ezcostura.usuario;

import com.ezcostura.config.ReactiveTenantHelper;
import com.ezcostura.usuario.dto.CreateUsuarioRequest;
import com.ezcostura.usuario.dto.ResetPasswordRequest;
import com.ezcostura.usuario.dto.UpdateUsuarioStatusRequest;
import com.ezcostura.usuario.dto.UsuarioDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.UUID;

/** Gestão de usuários de login — exclusiva do ADMIN. */
@RestController
@RequestMapping("/api/usuarios")
@PreAuthorize("hasRole('ADMIN')")
public class UsuarioController {

    private final UsuarioService service;

    public UsuarioController(UsuarioService service) {
        this.service = service;
    }

    @GetMapping
    public Mono<List<UsuarioDto>> findAll() {
        return ReactiveTenantHelper.runBlocking(service::findAll);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<UsuarioDto> create(@Valid @RequestBody CreateUsuarioRequest request) {
        return ReactiveTenantHelper.runBlocking(() -> service.create(request));
    }

    @PatchMapping("/{id}")
    public Mono<UsuarioDto> setAtivo(@PathVariable UUID id, @Valid @RequestBody UpdateUsuarioStatusRequest request) {
        return ReactiveTenantHelper.runBlocking(() -> service.setAtivo(id, request.ativo()));
    }

    @PostMapping("/{id}/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> resetPassword(@PathVariable UUID id, @Valid @RequestBody ResetPasswordRequest request) {
        return ReactiveTenantHelper.runBlocking(() -> {
            service.resetPassword(id, request.newPassword());
            return null;
        });
    }
}
