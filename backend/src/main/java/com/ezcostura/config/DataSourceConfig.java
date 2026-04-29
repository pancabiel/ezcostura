package com.ezcostura.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
@EnableConfigurationProperties(TenantProperties.class)
public class DataSourceConfig {

    @Value("${spring.datasource.url}")
    private String jdbcUrl;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    /**
     * Admin DataSource — connects to the default schema. Used to discover/create
     * tenant schemas before the routing DataSource is queried.
     */
    @Bean(name = "adminDataSource")
    public DataSource adminDataSource() {
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl(jdbcUrl);
        cfg.setUsername(username);
        cfg.setPassword(password);
        cfg.setMaximumPoolSize(2);
        cfg.setPoolName("hikari-admin");
        return new HikariDataSource(cfg);
    }

    @Bean
    @Primary
    public TenantRoutingDataSource dataSource() {
        return new TenantRoutingDataSource(jdbcUrl, username, password);
    }
}
