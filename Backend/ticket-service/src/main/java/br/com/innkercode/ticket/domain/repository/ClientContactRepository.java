package br.com.innkercode.ticket.domain.repository;

import br.com.innkercode.ticket.domain.entity.ClientContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClientContactRepository extends JpaRepository<ClientContact, UUID> {
    Optional<ClientContact> findByWhatsappNumber(String whatsappNumber);
}
