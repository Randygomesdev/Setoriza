package br.com.innkercode.ticket.domain.repository;

import br.com.innkercode.ticket.domain.entity.TicketSectorHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketSectorHistoryRepository extends JpaRepository<TicketSectorHistory, UUID> {
    
    Optional<TicketSectorHistory> findFirstByTicketIdAndExitedAtIsNull(UUID ticketId);
    
    List<TicketSectorHistory> findByTicketId(UUID ticketId);
    
    List<TicketSectorHistory> findBySectorId(UUID sectorId);
}
