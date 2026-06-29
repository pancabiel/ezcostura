package com.ezcostura.alocacao;

import com.ezcostura.alocacao.dto.AlocacaoDto;
import com.ezcostura.auth.Role;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
public class AlocacaoService {

    private final AlocacaoRepository repository;
    private final ZoneId fabricaZone;

    public AlocacaoService(AlocacaoRepository repository,
                           @Value("${ezcostura.timezone:America/Sao_Paulo}") String timezone) {
        this.repository = repository;
        this.fabricaZone = ZoneId.of(timezone);
    }

    @Transactional(readOnly = true)
    public List<AlocacaoDto> findByData(LocalDate data) {
        return repository.findByData(data).stream().map(AlocacaoMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<AlocacaoDto> findByOperarioAndData(UUID operarioId, LocalDate data) {
        return repository.findByOperarioAndData(operarioId, data).stream()
            .map(AlocacaoMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<AlocacaoDto> findByDataBetween(LocalDate inicio, LocalDate fim) {
        return repository.findByDataBetween(inicio, fim).stream().map(AlocacaoMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public AlocacaoDto findById(UUID id) {
        return AlocacaoMapper.toDto(repository.findById(id)
            .orElseThrow(() -> new AlocacaoNotFoundException(id)));
    }

    @Transactional
    public AlocacaoDto create(AlocacaoDto dto, Role autor) {
        Alocacao a = new Alocacao();
        a.setId(dto.id() != null ? dto.id() : UUID.randomUUID());
        a.markNew();
        a.setCreatedAt(OffsetDateTime.now());
        AlocacaoMapper.apply(dto, a);
        // Trava de horário (item 1): só o master (ADMIN/GERENTE) escolhe o horário de
        // início. O chão de fábrica (SUPERVISOR/OPERADOR) não pode retroagir/forjar — o
        // servidor carimba a hora atual da fábrica. Defesa real, independente da trava de UI.
        if (!isMaster(autor)) {
            a.setHorarioInicio(LocalTime.now(fabricaZone));
        }
        return AlocacaoMapper.toDto(repository.save(a));
    }

    @Transactional
    public AlocacaoDto update(UUID id, AlocacaoDto dto, Role autor) {
        Alocacao a = repository.findById(id)
            .orElseThrow(() -> new AlocacaoNotFoundException(id));
        LocalTime horarioOriginal = a.getHorarioInicio();
        AlocacaoMapper.apply(dto, a);
        // O chão de fábrica (SUPERVISOR/OPERADOR) pode trocar lote/operação (caso de uso
        // do chão de fábrica), mas não editar o horário de início já registrado — preserva
        // o valor original. O master (ADMIN/GERENTE) edita livremente.
        if (!isMaster(autor)) {
            a.setHorarioInicio(horarioOriginal);
        }
        return AlocacaoMapper.toDto(repository.save(a));
    }

    /** Master = planejador (gerenciador): escolhe/edita o horário de início livremente. */
    private static boolean isMaster(Role autor) {
        return autor == Role.ADMIN || autor == Role.GERENTE;
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new AlocacaoNotFoundException(id);
        }
        repository.deleteById(id);
    }
}
