package com.ezcostura.pack;

import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PackRepository extends CrudRepository<Pack, UUID> {

    @Query("SELECT * FROM packs WHERE data = :data ORDER BY horario")
    List<Pack> findByData(@Param("data") LocalDate data);

    @Query("SELECT * FROM packs WHERE operario_id = :operarioId AND data = :data ORDER BY horario")
    List<Pack> findByOperarioAndData(@Param("operarioId") UUID operarioId, @Param("data") LocalDate data);

    @Query("SELECT * FROM packs WHERE data BETWEEN :inicio AND :fim ORDER BY data, operario_id, horario")
    List<Pack> findByDataBetween(@Param("inicio") LocalDate inicio, @Param("fim") LocalDate fim);

    @Query(
      "SELECT operario_id, data, COALESCE(SUM(quantidade), 0) AS total " +
      "FROM packs WHERE data BETWEEN :inicio AND :fim " +
      "GROUP BY operario_id, data " +
      "ORDER BY data, operario_id"
    )
    List<ProducaoPorOperarioDia> producaoPorOperarioDia(
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim
    );

    @Query(
      "SELECT a.lote_id, COALESCE(SUM(p.quantidade), 0) AS total " +
      "FROM packs p JOIN alocacoes a ON a.id = p.alocacao_id " +
      "WHERE p.data BETWEEN :inicio AND :fim " +
      "GROUP BY a.lote_id"
    )
    List<ProducaoPorLote> producaoPorLote(
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim
    );

    @Query(
      "SELECT COALESCE(SUM(p.quantidade), 0) " +
      "FROM packs p JOIN alocacoes a ON a.id = p.alocacao_id " +
      "WHERE a.lote_id = :loteId AND p.tamanho = :tamanho AND a.operacao_id = :operacaoId"
    )
    long sumByLoteTamanhoOperacao(
        @Param("loteId") UUID loteId,
        @Param("tamanho") String tamanho,
        @Param("operacaoId") UUID operacaoId
    );

    record ProducaoPorOperarioDia(UUID operarioId, LocalDate data, long total) {}

    record ProducaoPorLote(UUID loteId, long total) {}
}
