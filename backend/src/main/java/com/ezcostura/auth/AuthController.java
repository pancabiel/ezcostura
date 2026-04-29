package com.ezcostura.auth;

import com.ezcostura.auth.dto.LoginRequest;
import com.ezcostura.auth.dto.RefreshRequest;
import com.ezcostura.auth.dto.TokenResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/login")
    public Mono<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return Mono.fromCallable(() -> service.login(request)).subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/refresh")
    public Mono<TokenResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return Mono.fromCallable(() -> service.refresh(request)).subscribeOn(Schedulers.boundedElastic());
    }
}
