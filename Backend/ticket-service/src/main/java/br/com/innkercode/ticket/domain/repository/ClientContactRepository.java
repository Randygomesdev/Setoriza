package br.com.innkercode.ticket.domain.repository;

import br.com.innkercode.ticket.domain.entity.ClientContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClientContactRepository extends JpaRepository<ClientContact, UUID> {
    
    @Query(value = "SELECT * FROM client_contacts WHERE whatsapp_number = :whatsappNumber ORDER BY created_at DESC LIMIT 1", nativeQuery = true)
    Optional<ClientContact> findByWhatsappNumber(@Param("whatsappNumber") String whatsappNumber);
    
    List<ClientContact> findAllByWhatsappNumber(String whatsappNumber);
    
    boolean existsByWhatsappNumber(String whatsappNumber);
    
    boolean existsByClientIdAndWhatsappNumber(UUID clientId, String whatsappNumber);
}
