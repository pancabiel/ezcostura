package com.ezcostura.operario;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OperarioRepository extends CrudRepository<Operario, UUID> {
    List<Operario> findAllByOrderByNomeAsc();
    List<Operario> findAllByAtivoOrderByNomeAsc(boolean ativo);
    List<Operario> findAllByJornadaIdOrderByNomeAsc(UUID jornadaId);
    Optional<Operario> findByCpf(String cpf);
}
