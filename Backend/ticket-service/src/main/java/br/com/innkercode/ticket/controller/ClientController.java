package br.com.innkercode.ticket.controller;

import br.com.innkercode.ticket.domain.entity.Client;
import br.com.innkercode.ticket.domain.entity.ClientContact;
import br.com.innkercode.ticket.domain.repository.ClientContactRepository;
import br.com.innkercode.ticket.domain.repository.ClientRepository;
import br.com.innkercode.ticket.dto.ContactSearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/clients")
@RequiredArgsConstructor
@Slf4j
public class ClientController {

    private final ClientRepository clientRepository;
    private final ClientContactRepository clientContactRepository;

    @GetMapping
    public ResponseEntity<List<Client>> getAll(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        log.info("Listando clientes. Solicitante role: {}", userRole);
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(clientRepository.findAll());
    }

    @GetMapping("/contacts")
    public ResponseEntity<List<ContactSearchResponse>> searchContacts(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        log.info("Listando contatos de clientes para busca. Solicitante role: {}", userRole);
        if (userRole == null || userRole.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<ClientContact> contacts = clientContactRepository.findAll();
        List<ContactSearchResponse> response = contacts.stream()
                .map(c -> new ContactSearchResponse(
                        c.getId(),
                        c.getContactName(),
                        c.getWhatsappNumber(),
                        c.getClient() != null ? c.getClient().getCompanyName() : "Avulso",
                        c.getClient() != null ? c.getClient().getTradeName() : "Avulso"
                ))
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Client> create(
            @RequestBody Client client,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        log.info("Criando novo cliente corporativo: {}. Solicitante role: {}", client.getCompanyName(), userRole);
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        client.setId(null);
        return ResponseEntity.ok(clientRepository.save(client));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Client> update(
            @PathVariable UUID id,
            @RequestBody Client clientDetails,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        log.info("Atualizando cliente ID: {}. Solicitante role: {}", id, userRole);
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado"));
        client.setCnpj(clientDetails.getCnpj());
        client.setCompanyName(clientDetails.getCompanyName());
        client.setTradeName(clientDetails.getTradeName());
        return ResponseEntity.ok(clientRepository.save(client));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        log.info("Removendo cliente ID: {}. Solicitante role: {}", id, userRole);
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado"));
        clientRepository.delete(client);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{clientId}/contacts")
    public ResponseEntity<ClientContact> addContact(
            @PathVariable UUID clientId,
            @RequestBody ClientContact contact,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (contact.getWhatsappNumber() == null || contact.getWhatsappNumber().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O número de WhatsApp é obrigatório.");
        }
        if (contact.getContactName() == null || contact.getContactName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O nome do contato é obrigatório.");
        }

        // Clean formatting from phone number to guarantee storage consistency
        String cleanPhone = contact.getWhatsappNumber().replaceAll("\\D", "");
        contact.setWhatsappNumber(cleanPhone);

        log.info("Adicionando contato de WhatsApp {} para o cliente ID: {}. Solicitante role: {}", 
                contact.getWhatsappNumber(), clientId, userRole);

        // Check if phone number already exists for this client
        if (clientContactRepository.existsByClientIdAndWhatsappNumber(clientId, contact.getWhatsappNumber())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este número de WhatsApp já está cadastrado para este cliente.");
        }

        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado"));
        
        contact.setId(null);
        contact.setClient(client);
        return ResponseEntity.ok(clientContactRepository.save(contact));
    }

    @DeleteMapping("/{clientId}/contacts/{contactId}")
    public ResponseEntity<Void> removeContact(
            @PathVariable UUID clientId,
            @PathVariable UUID contactId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        log.info("Removendo contato ID {} do cliente ID: {}. Solicitante role: {}", contactId, clientId, userRole);
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        ClientContact contact = clientContactRepository.findById(contactId)
                .orElseThrow(() -> new IllegalArgumentException("Contato não encontrado"));
        if (!contact.getClient().getId().equals(clientId)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        clientContactRepository.delete(contact);
        return ResponseEntity.ok().build();
    }
}
