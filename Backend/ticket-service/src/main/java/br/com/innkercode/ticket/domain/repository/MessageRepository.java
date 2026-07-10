package br.com.innkercode.ticket.domain.repository;

import br.com.innkercode.ticket.domain.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    List<Message> findByTicketIdOrderBySentAtAsc(UUID ticketId);
    java.util.Optional<Message> findByWhatsappMsgId(String whatsappMsgId);
}
