package com.ezcostura.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * CORS is allowlist-based. Configure the comma-separated origins via the
 * {@code EZCOSTURA_CORS_ORIGINS} environment variable
 * (e.g. {@code https://app.example.com,https://admin.example.com}).
 *
 * The default is the local Vite dev server only. Wildcard origins ({@code *})
 * combined with credentials are explicitly rejected because they expose every
 * authenticated endpoint to CSRF from arbitrary sites.
 */
@Configuration
public class CorsConfig {

    private final List<String> allowedOrigins;

    public CorsConfig(@Value("${ezcostura.cors.allowed-origins:http://localhost:5173}") String origins) {
        this.allowedOrigins = Arrays.stream(origins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
        if (allowedOrigins.stream().anyMatch("*"::equals)) {
            throw new IllegalStateException(
                "ezcostura.cors.allowed-origins must not contain '*'. " +
                "List explicit origins (scheme://host[:port]) instead.");
        }
    }

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(allowedOrigins);
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With"));
        cfg.setExposedHeaders(List.of("Location"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cfg);
        return new CorsWebFilter(source);
    }
}
