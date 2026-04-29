package com.ezcostura.ausencia;

import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AusenciaRepository extends CrudRepository<Ausencia, UUID> {

    @Query("""
        SELECT * FROM ausencias
        WHERE data_inicio <= :ate AND data_fim >= :de
        ORDER BY data_inicio DESC
        """)
    List<Ausencia> findByPeriodo(@Param("de") LocalDate de, @Param("ate") LocalDate ate);

    @Query("""
        SELECT * FROM ausencias
        WHERE operario_id = :operarioId
          AND data_inicio <= :ate AND data_fim >= :de
        ORDER BY data_inicio DESC
        """)
    List<Ausencia> findByOperarioAndPeriodo(
        @Param("operarioId") UUID operarioId,
        @Param("de") LocalDate de,
        @Param("ate") LocalDate ate
    );

    @Query("""
        SELECT * FROM ausencias
        WHERE data_inicio <= :data AND data_fim >= :data
        """)
    List<Ausencia> findActiveOn(@Param("data") LocalDate data);
}
