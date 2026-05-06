package com.ezcostura.jornada;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface JornadaRepository extends CrudRepository<Jornada, UUID> {
    List<Jornada> findAllByOrderByNomeAsc();
}
