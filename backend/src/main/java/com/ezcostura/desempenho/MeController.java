package com.ezcostura.desempenho;

import com.ezcostura.auth.AuthenticatedPrincipal;
import com.ezcostura.auth.Role;
import com.ezcostura.config.ReactiveTenantHelper;
import com.ezcostura.desempenho.dto.DesempenhoDiaDto;
import com.ezcostura.desempenho.dto.DesempenhoPeriodoDto;
import com.ezcostura.desempenho.dto.MeuPackDto;
import com.ezcostura.desempenho.dto.PerfilDto;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Portal do operário — endpoints que cada funcionário usa pra ver o próprio progresso.
 * Todos os métodos resolvem o operário a partir do JWT ({@code principal.userId()}),
 * nunca de parâmetro: um operário não pode ler dados de outro.
 */
@RestController
@RequestMapping("/api/me")
@PreAuthorize("hasRole('OPERARIO_SELF')")
public class MeController {

    private final DesempenhoService service;

    public MeController(DesempenhoService service) {
        this.service = service;
    }

    @GetMapping("/perfil")
    public Mono<PerfilDto> perfil(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        UUID id = ensureOperarioSelf(principal);
        return ReactiveTenantHelper.runBlocking(() -> service.perfil(id));
    }

    @GetMapping("/hoje")
    public Mono<DesempenhoDiaDto> hoje(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        UUID id = ensureOperarioSelf(principal);
        return ReactiveTenantHelper.runBlocking(() -> service.calcularDia(id, LocalDate.now()));
    }

    @GetMapping("/dia")
    public Mono<DesempenhoDiaDto> dia(
        @AuthenticationPrincipal AuthenticatedPrincipal principal,
        @RequestParam("data") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data
    ) {
        UUID id = ensureOperarioSelf(principal);
        return ReactiveTenantHelper.runBlocking(() -> service.calcularDia(id, data));
    }

    @GetMapping("/packs")
    public Mono<List<MeuPackDto>> packs(
        @AuthenticationPrincipal AuthenticatedPrincipal principal,
        @RequestParam("data") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data
    ) {
        UUID id = ensureOperarioSelf(principal);
        return ReactiveTenantHelper.runBlocking(() -> service.meusPacksDoDia(id, data));
    }

    @GetMapping("/periodo")
    public Mono<DesempenhoPeriodoDto> periodo(
        @AuthenticationPrincipal AuthenticatedPrincipal principal,
        @RequestParam("inicio") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
        @RequestParam("fim") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim
    ) {
        UUID id = ensureOperarioSelf(principal);
        return ReactiveTenantHelper.runBlocking(() -> service.calcularPeriodo(id, inicio, fim));
    }

    private static UUID ensureOperarioSelf(AuthenticatedPrincipal principal) {
        if (principal == null || principal.role() != Role.OPERARIO_SELF) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return principal.userId();
    }
}
