package com.ezcostura.auth;

import com.ezcostura.auth.dto.ChangePinRequest;
import com.ezcostura.auth.dto.OperarioLoginRequest;
import com.ezcostura.auth.dto.OperarioTokenResponse;
import com.ezcostura.auth.dto.RefreshRequest;
import jakarta.validation.Valid;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@RestController
@RequestMapping("/api/auth/operario")
public class OperarioAuthController {

    private final OperarioAuthService service;

    public OperarioAuthController(OperarioAuthService service) {
        this.service = service;
    }

    @PostMapping("/login")
    public Mono<OperarioTokenResponse> login(@Valid @RequestBody OperarioLoginRequest request) {
        return Mono.fromCallable(() -> service.login(request)).subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/refresh")
    public Mono<OperarioTokenResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return Mono.fromCallable(() -> service.refresh(request)).subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/change-pin")
    public Mono<Void> changePin(@AuthenticationPrincipal AuthenticatedPrincipal principal,
                                @Valid @RequestBody ChangePinRequest request) {
        if (principal == null || principal.role() != Role.OPERARIO_SELF) {
            return Mono.error(new BadCredentialsException("Token inválido"));
        }
        return Mono.<Void>fromRunnable(() ->
            service.changePin(principal.userId(), principal.tenantId(), request)
        ).subscribeOn(Schedulers.boundedElastic()).then();
    }
}
