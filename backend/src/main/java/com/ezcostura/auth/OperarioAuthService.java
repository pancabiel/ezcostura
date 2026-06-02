package com.ezcostura.auth;

import com.ezcostura.auth.dto.ChangePinRequest;
import com.ezcostura.auth.dto.OperarioLoginRequest;
import com.ezcostura.auth.dto.OperarioTokenResponse;
import com.ezcostura.auth.dto.RefreshRequest;
import com.ezcostura.config.TenantContext;
import com.ezcostura.config.TenantRoutingDataSource;
import com.ezcostura.operario.Operario;
import com.ezcostura.operario.OperarioRepository;
import io.jsonwebtoken.Claims;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;
import java.util.function.Supplier;

@Service
public class OperarioAuthService {

    // Trava por operário após N tentativas falhas. Per-IP throttle é follow-up.
    static final int MAX_FAILED_ATTEMPTS = 5;
    static final int LOCKOUT_MINUTES = 30;

    private final OperarioRepository operarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TenantRoutingDataSource routingDataSource;

    public OperarioAuthService(OperarioRepository operarioRepository,
                               PasswordEncoder passwordEncoder,
                               JwtService jwtService,
                               TenantRoutingDataSource routingDataSource) {
        this.operarioRepository = operarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.routingDataSource = routingDataSource;
    }

    public OperarioTokenResponse login(OperarioLoginRequest request) {
        String tenantId = normalizeTenantId(request.tenantId());
        ensureTenantKnown(tenantId);
        String cpf = normalizeCpf(request.cpf());
        return runForTenant(tenantId, () -> {
            Operario op = operarioRepository.findByCpf(cpf)
                .filter(Operario::isAtivo)
                .filter(o -> o.getPinHash() != null)
                .orElseThrow(() -> new BadCredentialsException("CPF ou PIN inválidos"));

            OffsetDateTime now = OffsetDateTime.now();
            if (op.getPinLockedUntil() != null && op.getPinLockedUntil().isAfter(now)) {
                throw new LockedException("Acesso bloqueado temporariamente. Tente novamente mais tarde.");
            }

            if (!passwordEncoder.matches(request.pin(), op.getPinHash())) {
                registerFailedAttempt(op, now);
                throw new BadCredentialsException("CPF ou PIN inválidos");
            }

            // Sucesso: zera contadores
            op.setPinFailedAttempts(0);
            op.setPinLockedUntil(null);
            operarioRepository.save(op);

            return issueTokens(op, tenantId);
        });
    }

    public OperarioTokenResponse refresh(RefreshRequest request) {
        Claims claims = jwtService.parse(request.refreshToken());
        if (!"refresh".equals(claims.get("type", String.class))) {
            throw new BadCredentialsException("Token inválido");
        }
        Role role = Role.valueOf(claims.get("role", String.class));
        if (role != Role.OPERARIO_SELF) {
            throw new BadCredentialsException("Token inválido");
        }
        UUID operarioId = UUID.fromString(claims.getSubject());
        String tenantId = normalizeTenantId(claims.get("tenantId", String.class));
        ensureTenantKnown(tenantId);
        return runForTenant(tenantId, () -> {
            Operario op = operarioRepository.findById(operarioId)
                .filter(Operario::isAtivo)
                .filter(o -> o.getPinHash() != null)
                .orElseThrow(() -> new BadCredentialsException("Acesso não encontrado"));
            return issueTokens(op, tenantId);
        });
    }

    public void changePin(UUID operarioId, String tenantId, ChangePinRequest request) {
        String normalizedTenantId = normalizeTenantId(tenantId);
        ensureTenantKnown(normalizedTenantId);
        runForTenant(normalizedTenantId, () -> {
            Operario op = operarioRepository.findById(operarioId)
                .filter(Operario::isAtivo)
                .filter(o -> o.getPinHash() != null)
                .orElseThrow(() -> new BadCredentialsException("Acesso não encontrado"));
            if (!passwordEncoder.matches(request.currentPin(), op.getPinHash())) {
                throw new BadCredentialsException("PIN atual incorreto");
            }
            op.setPinHash(passwordEncoder.encode(request.newPin()));
            op.setPinChangedAt(OffsetDateTime.now());
            op.setPinFailedAttempts(0);
            op.setPinLockedUntil(null);
            operarioRepository.save(op);
            return null;
        });
    }

    private OperarioTokenResponse issueTokens(Operario op, String tenantId) {
        return new OperarioTokenResponse(
            jwtService.issueAccess(op.getId(), tenantId, Role.OPERARIO_SELF),
            jwtService.issueRefresh(op.getId(), tenantId, Role.OPERARIO_SELF),
            op.getId(),
            op.getNome(),
            tenantId,
            Role.OPERARIO_SELF
        );
    }

    private void registerFailedAttempt(Operario op, OffsetDateTime now) {
        int attempts = op.getPinFailedAttempts() + 1;
        op.setPinFailedAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            op.setPinLockedUntil(now.plusMinutes(LOCKOUT_MINUTES));
            op.setPinFailedAttempts(0); // reseta o contador no momento da trava
        }
        operarioRepository.save(op);
    }

    static String normalizeCpf(String cpf) {
        if (cpf == null) return null;
        return cpf.replaceAll("\\D", "");
    }

    private static String normalizeTenantId(String tenantId) {
        return tenantId == null ? null : tenantId.trim().toLowerCase(Locale.ROOT);
    }

    private void ensureTenantKnown(String tenantId) {
        if (!routingDataSource.isRegistered(tenantId)) {
            throw new BadCredentialsException("Facção não encontrada");
        }
    }

    private <T> T runForTenant(String tenantId, Supplier<T> action) {
        TenantContext.set(tenantId);
        try {
            return action.get();
        } finally {
            TenantContext.clear();
        }
    }
}
