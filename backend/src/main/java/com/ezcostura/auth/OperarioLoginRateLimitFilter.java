package com.ezcostura.auth;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Throttle por IP no login do portal do operário. O lockout por operário
 * (5 erros → 423) já existe, mas como o CPF é chutável um atacante poderia
 * varrer muitos CPFs de um mesmo IP sem nunca travar uma conta específica.
 * Este filtro limita a {@value #MAX_PER_MINUTE} tentativas por minuto por IP
 * e responde 429 acima disso. Janela fixa de 1 minuto, contador em memória.
 *
 * Roda antes do {@link JwtAuthFilter}; o caminho de login é público de qualquer forma.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class OperarioLoginRateLimitFilter implements WebFilter {

    static final String PATH = "/api/auth/operario/login";
    static final int MAX_PER_MINUTE = 10;
    private static final int MAX_TRACKED_IPS = 50_000;

    private final ConcurrentHashMap<String, Counter> counters = new ConcurrentHashMap<>();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        if (!HttpMethod.POST.equals(request.getMethod()) || !PATH.equals(request.getURI().getPath())) {
            return chain.filter(exchange);
        }

        long minute = Instant.now().getEpochSecond() / 60;
        String ip = clientIp(request);

        Counter counter = counters.compute(ip, (k, existing) -> {
            if (existing == null || existing.minute != minute) {
                return new Counter(minute, 1);
            }
            existing.count++;
            return existing;
        });

        // Limpeza oportunista para não crescer sem limite sob varredura distribuída.
        if (counters.size() > MAX_TRACKED_IPS) {
            counters.entrySet().removeIf(e -> e.getValue().minute != minute);
        }

        if (counter.count > MAX_PER_MINUTE) {
            return tooManyRequests(exchange);
        }
        return chain.filter(exchange);
    }

    /** IP do cliente: primeiro hop de X-Forwarded-For (atrás do Caddy) ou o socket. */
    private static String clientIp(ServerHttpRequest request) {
        String forwarded = request.getHeaders().getFirst("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        InetSocketAddress remote = request.getRemoteAddress();
        return remote != null ? remote.getAddress().getHostAddress() : "unknown";
    }

    private Mono<Void> tooManyRequests(ServerWebExchange exchange) {
        var response = exchange.getResponse();
        response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        response.getHeaders().add(HttpHeaders.RETRY_AFTER, "60");
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        byte[] body = ("{\"status\":429,\"error\":\"Too Many Requests\","
            + "\"message\":\"Muitas tentativas. Aguarde um minuto e tente novamente.\"}")
            .getBytes(StandardCharsets.UTF_8);
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body)));
    }

    /** Janela fixa de 1 minuto. {@code minute} é imutável; {@code count} muda só dentro de compute(). */
    private static final class Counter {
        final long minute;
        int count;

        Counter(long minute, int count) {
            this.minute = minute;
            this.count = count;
        }
    }
}
