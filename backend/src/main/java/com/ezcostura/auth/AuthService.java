package com.ezcostura.auth;

import com.ezcostura.auth.dto.ChangePasswordRequest;
import com.ezcostura.auth.dto.LoginRequest;
import com.ezcostura.auth.dto.RefreshRequest;
import com.ezcostura.auth.dto.TokenResponse;
import com.ezcostura.config.TenantContext;
import com.ezcostura.config.TenantRoutingDataSource;
import io.jsonwebtoken.Claims;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuthService {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TenantRoutingDataSource routingDataSource;

    public AuthService(AppUserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       TenantRoutingDataSource routingDataSource) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.routingDataSource = routingDataSource;
    }

    public TokenResponse login(LoginRequest request) {
        ensureTenantKnown(request.tenantId());
        return runForTenant(request.tenantId(), () -> {
            AppUser user = userRepository.findByUsername(request.username())
                .filter(AppUser::isAtivo)
                .orElseThrow(() -> new BadCredentialsException("Usuário ou senha inválidos"));
            if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
                throw new BadCredentialsException("Usuário ou senha inválidos");
            }
            Role role = Role.valueOf(user.getRole());
            return new TokenResponse(
                jwtService.issueAccess(user.getId(), request.tenantId(), role),
                jwtService.issueRefresh(user.getId(), request.tenantId(), role),
                user.getId(),
                user.getUsername(),
                request.tenantId(),
                role
            );
        });
    }

    public TokenResponse refresh(RefreshRequest request) {
        Claims claims = jwtService.parse(request.refreshToken());
        if (!"refresh".equals(claims.get("type", String.class))) {
            throw new BadCredentialsException("Token inválido");
        }
        UUID userId = UUID.fromString(claims.getSubject());
        String tenantId = claims.get("tenantId", String.class);
        Role role = Role.valueOf(claims.get("role", String.class));
        ensureTenantKnown(tenantId);
        return runForTenant(tenantId, () -> {
            AppUser user = userRepository.findById(userId)
                .filter(AppUser::isAtivo)
                .orElseThrow(() -> new BadCredentialsException("Usuário não encontrado"));
            return new TokenResponse(
                jwtService.issueAccess(user.getId(), tenantId, role),
                jwtService.issueRefresh(user.getId(), tenantId, role),
                user.getId(),
                user.getUsername(),
                tenantId,
                role
            );
        });
    }

    public void changePassword(UUID userId, String tenantId, ChangePasswordRequest request) {
        ensureTenantKnown(tenantId);
        runForTenant(tenantId, () -> {
            AppUser user = userRepository.findById(userId)
                .filter(AppUser::isAtivo)
                .orElseThrow(() -> new BadCredentialsException("Usuário não encontrado"));
            if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
                throw new BadCredentialsException("Senha atual incorreta");
            }
            user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
            userRepository.save(user);
            return null;
        });
    }

    private void ensureTenantKnown(String tenantId) {
        if (!routingDataSource.isRegistered(tenantId)) {
            throw new BadCredentialsException("Facção não encontrada");
        }
    }

    private <T> T runForTenant(String tenantId, java.util.function.Supplier<T> action) {
        TenantContext.set(tenantId);
        try {
            return action.get();
        } finally {
            TenantContext.clear();
        }
    }
}
