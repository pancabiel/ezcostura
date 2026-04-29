package com.ezcostura.config;

import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Bridges the reactive tenant context to a ThreadLocal so blocking JDBC code
 * (which the routing DataSource reads from) can pick up the current tenant.
 *
 * Usage:
 *   return ReactiveTenantHelper.runBlocking(() -> loteRepository.findAll());
 */
public final class ReactiveTenantHelper {

    private ReactiveTenantHelper() {}

    public static <T> Mono<T> runBlocking(Supplier<T> blocking) {
        return Mono.deferContextual(ctx -> {
            String tenantId = ctx.get(TenantContext.CONTEXT_KEY);
            return Mono.fromCallable(() -> {
                TenantContext.set(tenantId);
                try {
                    return blocking.get();
                } finally {
                    TenantContext.clear();
                }
            }).subscribeOn(Schedulers.boundedElastic());
        });
    }

    public static <T> Mono<T> runBlocking(Function<String, T> blocking) {
        return Mono.deferContextual(ctx -> {
            String tenantId = ctx.get(TenantContext.CONTEXT_KEY);
            return Mono.fromCallable(() -> {
                TenantContext.set(tenantId);
                try {
                    return blocking.apply(tenantId);
                } finally {
                    TenantContext.clear();
                }
            }).subscribeOn(Schedulers.boundedElastic());
        });
    }
}
