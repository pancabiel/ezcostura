package com.ezcostura.config;

import io.sentry.Sentry;
import io.sentry.SentryOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SentryConfig {

    @Value("${sentry.dsn:}")
    private String dsn;

    @PostConstruct
    void registerCallbacks() {
        if (dsn == null || dsn.isBlank()) {
            return;
        }
        Sentry.configureScope(scope -> {});
        SentryOptions options = Sentry.getCurrentHub().getOptions();
        options.setBeforeSend((event, hint) -> {
            String tenant = TenantContext.get();
            if (tenant != null && !tenant.isBlank()) {
                event.setTag("tenant", tenant);
            }
            // Strip request body / headers / cookies — they may contain customer
            // data or auth tokens. Keep URL + method which are useful and safe.
            if (event.getRequest() != null) {
                event.getRequest().setData(null);
                event.getRequest().setCookies(null);
                event.getRequest().setHeaders(null);
            }
            return event;
        });
    }
}
