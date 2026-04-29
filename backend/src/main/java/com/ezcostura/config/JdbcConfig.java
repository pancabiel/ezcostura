package com.ezcostura.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jdbc.core.dialect.JdbcPostgresDialect;
import org.springframework.data.relational.core.dialect.Dialect;

@Configuration
public class JdbcConfig {

    /**
     * Spring Data JDBC auto-detects the dialect by opening a connection on the
     * primary DataSource at startup. Our routing DataSource has no tenant in
     * context at that moment, so the probe fails. Declaring the dialect
     * explicitly bypasses the probe.
     */
    @Bean
    public Dialect jdbcDialect() {
        return JdbcPostgresDialect.INSTANCE;
    }
}
