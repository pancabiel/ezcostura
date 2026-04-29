package com.ezcostura.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "ezcostura.tenants")
public class TenantProperties {

    private List<String> initial = new ArrayList<>();

    public List<String> getInitial() {
        return initial;
    }

    public void setInitial(List<String> initial) {
        this.initial = initial;
    }
}
