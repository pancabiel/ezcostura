package com.ezcostura.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Routes JDBC calls to a per-tenant DataSource. Each tenant gets its own
 * HikariCP pool whose connections are pinned to the tenant's Postgres schema
 * via the `currentSchema` parameter.
 */
public class TenantRoutingDataSource extends AbstractRoutingDataSource {

    private final String jdbcUrl;
    private final String username;
    private final String password;
    private final Map<Object, Object> tenantDataSources = new ConcurrentHashMap<>();

    public TenantRoutingDataSource(String jdbcUrl, String username, String password) {
        this.jdbcUrl = jdbcUrl;
        this.username = username;
        this.password = password;
        setTargetDataSources(new HashMap<>(tenantDataSources));
        afterPropertiesSet();
    }

    @Override
    protected Object determineCurrentLookupKey() {
        return TenantContext.get();
    }

    public boolean isRegistered(String tenantId) {
        return tenantId != null && tenantDataSources.containsKey(tenantId);
    }

    public synchronized void registerTenant(String tenantId) {
        if (tenantDataSources.containsKey(tenantId)) {
            return;
        }
        String schema = schemaFor(tenantId);
        String separator = jdbcUrl.contains("?") ? "&" : "?";
        String tenantUrl = jdbcUrl + separator + "currentSchema=" + schema;
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl(tenantUrl);
        cfg.setUsername(username);
        cfg.setPassword(password);
        cfg.setMaximumPoolSize(5);
        cfg.setPoolName("hikari-" + tenantId);
        cfg.setConnectionInitSql("SET search_path TO \"" + schema + "\"");
        DataSource ds = new HikariDataSource(cfg);
        tenantDataSources.put(tenantId, ds);
        setTargetDataSources(new HashMap<>(tenantDataSources));
        afterPropertiesSet();
    }

    public static String schemaFor(String tenantId) {
        return "tenant_" + tenantId.replaceAll("[^a-zA-Z0-9_]", "_").toLowerCase();
    }
}
