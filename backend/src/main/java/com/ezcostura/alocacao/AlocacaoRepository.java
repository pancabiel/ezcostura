package com.ezcostura.alocacao;

import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AlocacaoRepository extends CrudRepository<Alocacao, UUID> {

    @Query("SELECT * FROM alocacoes WHERE data = :data ORDER BY operario_id, horario_inicio")
    List<Alocacao> findByData(@Param("data") LocalDate data);

    @Query("SELECT * FROM alocacoes WHERE operario_id = :operarioId AND data = :data ORDER BY horario_inicio")
    List<Alocacao> findByOperarioAndData(
        @Param("operarioId") UUID operarioId,
        @Param("data") LocalDate data
    );

    @Query("SELECT * FROM alocacoes WHERE data BETWEEN :inicio AND :fim ORDER BY data, operario_id, horario_inicio")
    List<Alocacao> findByDataBetween(
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim
    );
}
