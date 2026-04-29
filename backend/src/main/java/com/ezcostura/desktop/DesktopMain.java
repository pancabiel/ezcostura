package com.ezcostura.desktop;

import com.ezcostura.EzcosturaApplication;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.springframework.boot.SpringApplication;

import java.awt.Desktop;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Base64;

public final class DesktopMain {

    private static final int PG_PORT = 54329;
    private static final int APP_PORT = 8080;
    private static final String DB_NAME = "ezcostura";

    private DesktopMain() {}

    public static void main(String[] args) throws Exception {
        Path home = appHome();
        Path dataDir = home.resolve("pgdata");
        Files.createDirectories(dataDir);

        EmbeddedPostgres pg = EmbeddedPostgres.builder()
            .setPort(PG_PORT)
            .setDataDirectory(dataDir.toFile())
            .setCleanDataDirectory(false)
            .setOverrideWorkingDirectory(home.resolve("pgwork").toFile())
            .start();

        ensureDatabaseExists(pg);

        System.setProperty("spring.profiles.active", "desktop");
        System.setProperty("spring.datasource.url",
            "jdbc:postgresql://localhost:" + PG_PORT + "/" + DB_NAME);
        System.setProperty("spring.datasource.username", "postgres");
        System.setProperty("spring.datasource.password", "postgres");
        System.setProperty("server.port", String.valueOf(APP_PORT));
        System.setProperty("ezcostura.jwt.secret", loadOrCreateJwtSecret(home));

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                pg.close();
            } catch (Exception ignored) {
            }
        }));

        SpringApplication.run(EzcosturaApplication.class, args);
        openBrowser("http://localhost:" + APP_PORT);
    }

    private static Path appHome() {
        String appData = System.getenv("APPDATA");
        if (appData != null && !appData.isBlank()) {
            return Paths.get(appData, "ezcostura");
        }
        return Paths.get(System.getProperty("user.home"), ".ezcostura");
    }

    private static void ensureDatabaseExists(EmbeddedPostgres pg) throws Exception {
        try (Connection conn = pg.getPostgresDatabase().getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                 "SELECT 1 FROM pg_database WHERE datname = '" + DB_NAME + "'")) {
            if (!rs.next()) {
                try (Statement create = conn.createStatement()) {
                    create.execute("CREATE DATABASE " + DB_NAME);
                }
            }
        }
    }

    private static String loadOrCreateJwtSecret(Path home) throws Exception {
        Path secretFile = home.resolve("jwt.secret");
        if (Files.exists(secretFile)) {
            String existing = Files.readString(secretFile).trim();
            if (existing.length() >= 32) return existing;
        }
        byte[] raw = new byte[48];
        new SecureRandom().nextBytes(raw);
        String secret = Base64.getEncoder().encodeToString(raw);
        Files.writeString(secretFile, secret);
        try {
            secretFile.toFile().setReadable(false, false);
            secretFile.toFile().setReadable(true, true);
        } catch (Exception ignored) {
        }
        return secret;
    }

    private static void openBrowser(String url) {
        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(URI.create(url));
            }
        } catch (Exception ignored) {
        }
    }
}
