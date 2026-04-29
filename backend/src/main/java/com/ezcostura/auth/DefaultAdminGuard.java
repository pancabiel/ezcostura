package com.ezcostura.auth;

import com.ezcostura.config.TenantContext;
import com.ezcostura.config.TenantProperties;
import com.ezcostura.config.TenantRoutingDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Loud safety net: if the {@code admin/admin} user seeded by Flyway V3 is
 * still active in any tenant, log a critical warning every startup, and refuse
 * to start when the {@code prod} profile is active. The owner is expected to
 * change the password on first login.
 */
@Component
public class DefaultAdminGuard {

    private static final Logger log = LoggerFactory.getLogger(DefaultAdminGuard.class);
    private static final String DEFAULT_USERNAME = "admin";
    private static final String DEFAULT_PASSWORD = "admin";

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TenantRoutingDataSource routingDataSource;
    private final TenantProperties tenantProperties;
    private final Environment environment;
    private final boolean allowDefaultAdmin;

    public DefaultAdminGuard(AppUserRepository userRepository,
                             PasswordEncoder passwordEncoder,
                             TenantRoutingDataSource routingDataSource,
                             TenantProperties tenantProperties,
                             Environment environment,
                             @Value("${ezcostura.security.allow-default-admin:true}") boolean allowDefaultAdmin) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.routingDataSource = routingDataSource;
        this.tenantProperties = tenantProperties;
        this.environment = environment;
        this.allowDefaultAdmin = allowDefaultAdmin;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void check() {
        boolean prod = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        for (String tenantId : tenantProperties.getInitial()) {
            if (hasDefaultAdmin(tenantId)) {
                String msg = "Tenant '" + tenantId + "' still uses the default admin/admin credentials. " +
                    "Change the password on first login.";
                if (prod && !allowDefaultAdmin) {
                    throw new IllegalStateException(
                        msg + " Refusing to start in 'prod' profile. " +
                        "Reset the password (BCrypt) directly in the users table or set " +
                        "ezcostura.security.allow-default-admin=true to override.");
                }
                log.warn("SECURITY: {}", msg);
            }
        }
    }

    private boolean hasDefaultAdmin(String tenantId) {
        routingDataSource.registerTenant(tenantId);
        TenantContext.set(tenantId);
        try {
            return userRepository.findByUsername(DEFAULT_USERNAME)
                .map(u -> u.isAtivo() && passwordEncoder.matches(DEFAULT_PASSWORD, u.getPasswordHash()))
                .orElse(false);
        } catch (Exception e) {
            log.debug("Default-admin check skipped for tenant {}: {}", tenantId, e.getMessage());
            return false;
        } finally {
            TenantContext.clear();
        }
    }
}
