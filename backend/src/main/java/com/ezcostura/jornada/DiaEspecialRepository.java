package com.ezcostura.jornada;

import org.springframework.data.repository.CrudRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface DiaEspecialRepository extends CrudRepository<DiaEspecial, UUID> {
    List<DiaEspecial> findAllByOrderByDataDesc();
    List<DiaEspecial> findByDataOrderByCreatedAtAsc(LocalDate data);
}
