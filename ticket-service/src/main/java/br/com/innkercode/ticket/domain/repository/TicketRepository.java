package br.com.innkercode.ticket.domain.repository;

import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.model.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, UUID> {

    Optional<Ticket> findFirstByWhatsappNumberAndStatusNotOrderByCreatedAtDesc(String whatsappNumber, TicketStatus status);

    boolean existsByWhatsappNumberAndStatusNot(String whatsappNumber, TicketStatus status);
}
