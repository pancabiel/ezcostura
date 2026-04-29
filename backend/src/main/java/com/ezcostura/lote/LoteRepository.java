package com.ezcostura.lote;

import org.springframework.data.repository.CrudRepository;

import java.util.Optional;
import java.util.UUID;

public interface LoteRepository extends CrudRepository<Lote, UUID> {

    Optional<Lote> findByCodigo(String codigo);

    boolean existsByCodigo(String codigo);
}
