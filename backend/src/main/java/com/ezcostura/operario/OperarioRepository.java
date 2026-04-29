package com.ezcostura.operario;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface OperarioRepository extends CrudRepository<Operario, UUID> {
    List<Operario> findAllByOrderByNomeAsc();
    List<Operario> findAllByAtivoOrderByNomeAsc(boolean ativo);
}
