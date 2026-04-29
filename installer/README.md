# ezcostura — desktop installer

Builds a self-contained Windows distribution of ezcostura that runs entirely
on a single PC (no Docker, no external Postgres).

What's bundled:
- Spring Boot backend (uber-jar) running on `localhost:8080`
- Frontend served from the same backend (no separate web server)
- PostgreSQL **embedded** via Zonky (`io.zonky.test:embedded-postgres`),
  data stored in `%APPDATA%\ezcostura\pgdata`
- Optional: minimal JRE produced with `jlink` so the user PC does not need
  Java installed

## Prerequisites (on the build machine — your PC)

- JDK 21 (with `java`, `jlink` and, optionally, `jpackage` on PATH)
- Maven 3.9+
- Node 18+ / npm
- Optional, only if you want a real `.exe`/`.msi` installer:
  [WiX Toolset 3.x](https://wixtoolset.org/docs/wix3/) on PATH

## Build a portable bundle (zip-and-ship)

```powershell
cd installer
.\build.ps1
```

Result: `installer/dist/ezcostura/` containing `ezcostura.jar`,
`Iniciar ezcostura.cmd`, `LEIA-ME.txt` and the bundled `jre/`.
Zip the folder and send it to the user. They unzip and double-click the `.cmd`.

## Build a real Windows installer (.exe)

```powershell
cd installer
.\build.ps1 -Installer
```

Requires WiX 3 on PATH. Output in `installer/dist/installer/`.

## What happens at runtime

`com.ezcostura.desktop.DesktopMain` is the entry point in desktop mode:

1. Creates `%APPDATA%\ezcostura\pgdata` if missing.
2. Boots embedded Postgres on port `54329` using that directory.
3. Creates the `ezcostura` database on first run.
4. Sets `spring.profiles.active=desktop` and the JDBC URL via system properties.
5. Boots Spring on port `8080` — the existing `MultiTenantFlywayMigrator`
   creates the `local` tenant schema and runs migrations.
6. Opens the user's default browser at `http://localhost:8080`.
7. On JVM shutdown, gracefully stops Postgres.

The `desktop` Spring profile (see `application-desktop.yml`):
- Defines a single tenant: `local`.
- Uses a stable JWT secret (rotate if you publish builds).
- Serves frontend static files from `classpath:/static/` and falls back to
  `index.html` for SPA routes via `SpaFallbackController`.

The default user is `admin` / `admin` (seeded by Flyway migration `V3`).

## Folder layout produced

```
installer/dist/ezcostura/
├── ezcostura.jar                Spring Boot fat jar (with frontend inside)
├── jre/                         Minimal JRE produced by jlink
├── Iniciar ezcostura.cmd        User-facing launcher
└── LEIA-ME.txt                  Portuguese instructions for the user
```

## Tradeoffs vs. cloud hosting

- **Free** — runs on the user's PC.
- Bound to one machine; tablets must be on the same Wi-Fi.
- Backups are manual (copy `%APPDATA%\ezcostura\pgdata`).
- Updates = redistribute a new zip.
- HTTPS is not configured (LAN only — `http://`). Do not expose to the
  public internet.
