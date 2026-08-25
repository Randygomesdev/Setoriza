package br.com.innkercode.ticket.domain.repository;

import br.com.innkercode.ticket.domain.entity.WhatsAppConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface WhatsAppConfigRepository extends JpaRepository<WhatsAppConfig, UUID> {
}
