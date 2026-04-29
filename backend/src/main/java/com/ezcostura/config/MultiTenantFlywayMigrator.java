package com.ezcostura.config;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * On startup:
 * 1. Discovers existing tenant schemas (those starting with `tenant_`).
 * 2. Adds any tenants from configuration that don't yet have a schema.
 * 3. Runs Flyway migrations against each tenant schema.
 * 4. Registers each tenant DataSource in the routing DataSource.
 */
@Component
public class MultiTenantFlywayMigrator {

    private static final Logger log = LoggerFactory.getLogger(MultiTenantFlywayMigrator.class);

    private final DataSource adminDataSource;
    private final TenantRoutingDataSource routingDataSource;
    private final TenantProperties tenantProperties;

    public MultiTenantFlywayMigrator(@Qualifier("adminDataSource") DataSource adminDataSource,
                                     TenantRoutingDataSource routingDataSource,
                                     TenantProperties tenantProperties) {
        this.adminDataSource = adminDataSource;
        this.routingDataSource = routingDataSource;
        this.tenantProperties = tenantProperties;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void migrateAllTenants() {
        Set<String> tenants = new LinkedHashSet<>();
        tenants.addAll(discoverTenants());
        tenants.addAll(tenantProperties.getInitial());

        for (String tenantId : tenants) {
            String schema = TenantRoutingDataSource.schemaFor(tenantId);
            ensureSchema(schema);
            runFlyway(schema);
            routingDataSource.registerTenant(tenantId);
            log.info("Tenant '{}' ready (schema: {})", tenantId, schema);
        }
    }

    private Set<String> discoverTenants() {
        Set<String> result = new LinkedHashSet<>();
        try (Connection conn = adminDataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                 "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'")) {
            while (rs.next()) {
                String schema = rs.getString(1);
                result.add(schema.substring("tenant_".length()));
            }
        } catch (Exception e) {
            log.warn("Failed to discover tenant schemas: {}", e.getMessage());
        }
        return result;
    }

    private void ensureSchema(String schema) {
        try (Connection conn = adminDataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE SCHEMA IF NOT EXISTS \"" + schema + "\"");
        } catch (Exception e) {
            throw new IllegalStateException("Failed to create schema " + schema, e);
        }
    }

    private void runFlyway(String schema) {
        Flyway flyway = Flyway.configure()
            .dataSource(adminDataSource)
            .schemas(schema)
            .defaultSchema(schema)
            .locations("classpath:db/migration")
            .baselineOnMigrate(true)
            .load();
        flyway.migrate();
    }
}
