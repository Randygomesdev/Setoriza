package br.com.innkercode.ticket.controller;

import br.com.innkercode.ticket.domain.entity.Client;
import br.com.innkercode.ticket.domain.entity.ClientContact;
import br.com.innkercode.ticket.domain.repository.ClientContactRepository;
import br.com.innkercode.ticket.domain.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
        log.info("Adicionando contato de WhatsApp {} para o cliente ID: {}. Solicitante role: {}", 
                contact.getWhatsappNumber(), clientId, userRole);
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado"));
        
        contact.setId(null);
        contact.setClient(client);
        return ResponseEntity.ok(clientContactRepository.save(contact));
    }
}
