package br.com.innkercode.ticket.domain.repository;

import br.com.innkercode.ticket.domain.entity.AiConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface AiConfigRepository extends JpaRepository<AiConfig, UUID> {
}
