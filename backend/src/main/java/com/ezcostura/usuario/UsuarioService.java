package com.ezcostura.usuario;

import com.ezcostura.auth.AppUser;
import com.ezcostura.auth.AppUserRepository;
import com.ezcostura.auth.Role;
import com.ezcostura.usuario.dto.CreateUsuarioRequest;
import com.ezcostura.usuario.dto.UsuarioDto;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class UsuarioService {

    /** Papéis que o admin pode criar/alterar pela gestão de usuários. */
    private static final Set<Role> PAPEIS_GERENCIAVEIS = EnumSet.of(Role.GERENTE, Role.SUPERVISOR);

    private final AppUserRepository repository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(AppUserRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UsuarioDto> findAll() {
        return repository.findAllByOrderByUsernameAsc().stream().map(UsuarioService::toDto).toList();
    }

    @Transactional
    public UsuarioDto create(CreateUsuarioRequest request) {
        if (!PAPEIS_GERENCIAVEIS.contains(request.role())) {
            throw new IllegalArgumentException("Só é possível criar usuários Gerente ou Supervisor.");
        }
        String username = request.username().trim();
        if (username.isEmpty()) {
            throw new IllegalArgumentException("Usuário é obrigatório.");
        }
        if (repository.existsByUsername(username)) {
            throw new IllegalArgumentException("Já existe um usuário com esse nome.");
        }
        AppUser user = new AppUser();
        user.setId(UUID.randomUUID());
        user.markNew();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role().name());
        user.setAtivo(true);
        user.setCreatedAt(OffsetDateTime.now());
        return toDto(repository.save(user));
    }

    @Transactional
    public UsuarioDto setAtivo(UUID id, boolean ativo) {
        AppUser user = loadGerenciavel(id);
        user.setAtivo(ativo);
        return toDto(repository.save(user));
    }

    @Transactional
    public void resetPassword(UUID id, String newPassword) {
        AppUser user = loadGerenciavel(id);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        repository.save(user);
    }

    /**
     * Carrega um usuário e garante que ele é gerenciável (Gerente/Supervisor).
     * Contas ADMIN (e qualquer outro papel) não podem ser desativadas nem ter a
     * senha redefinida por aqui — evita auto-lockout e mexer em contas de owner.
     */
    private AppUser loadGerenciavel(UUID id) {
        AppUser user = repository.findById(id).orElseThrow(() -> new UsuarioNotFoundException(id));
        Role role = Role.valueOf(user.getRole());
        if (!PAPEIS_GERENCIAVEIS.contains(role)) {
            throw new IllegalArgumentException("Só é possível alterar usuários Gerente ou Supervisor.");
        }
        return user;
    }

    private static UsuarioDto toDto(AppUser u) {
        return new UsuarioDto(
            u.getId(),
            u.getUsername(),
            Role.valueOf(u.getRole()),
            u.isAtivo(),
            u.getCreatedAt()
        );
    }
}
