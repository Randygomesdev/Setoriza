package br.com.innkercode.ticket.controller;

import br.com.innkercode.ticket.domain.entity.Message;
import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.model.Sector;
import br.com.innkercode.ticket.domain.model.TicketStatus;
import br.com.innkercode.ticket.dto.MessageResponse;
import br.com.innkercode.ticket.dto.SendMessageRequest;
import br.com.innkercode.ticket.service.MessageService;
import br.com.innkercode.ticket.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
@Slf4j
public class TicketController {

    private final TicketService ticketService;
    private final MessageService messageService;

    @GetMapping
    public ResponseEntity<List<Ticket>> listTickets(
            @RequestParam(required = false) List<TicketStatus> status,
            @RequestParam(required = false) Sector sector,
            @RequestParam(required = false) UUID assignedAgentId
    ) {
        log.info("Listando tickets com filtros - status: {}, sector: {}, assignedAgentId: {}", status, sector, assignedAgentId);
        List<Ticket> tickets = ticketService.getTickets(status, sector, assignedAgentId);
        return ResponseEntity.ok(tickets);
    }

    @PostMapping("/{id}/claim")
    public ResponseEntity<Ticket> claimTicket(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Id", required = false) String userIdStr
    ) {
        log.info("Recebida requisição para capturar ticket {} pelo atendente ID: {}", id, userIdStr);
        if (userIdStr == null || userIdStr.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        UUID agentId = UUID.fromString(userIdStr);
        Ticket ticket = ticketService.assignAgent(id, agentId);
        return ResponseEntity.ok(ticket);
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<Ticket> resolveTicket(@PathVariable UUID id) {
        log.info("Recebida requisição para concluir ticket {}", id);
        Ticket ticket = ticketService.resolveTicket(id);
        return ResponseEntity.ok(ticket);
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<MessageResponse>> getTicketMessages(@PathVariable UUID id) {
        log.info("Recebida requisição para recuperar histórico de mensagens do ticket {}", id);
        List<Message> messages = messageService.getMessagesByTicketId(id);
        List<MessageResponse> response = messages.stream()
                .map(m -> new MessageResponse(
                        m.getId(),
                        m.getTicket().getId(),
                        m.getSenderType(),
                        m.getMessageType(),
                        m.getContent(),
                        m.getSentAt()
                ))
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<MessageResponse> sendOperatorMessage(
            @PathVariable UUID id,
            @Valid @RequestBody SendMessageRequest request
    ) {
        log.info("Recebida requisição de resposta humana para o ticket {}", id);
        Ticket ticket = ticketService.getTicketById(id);
        Message message = messageService.sendOperatorMessage(ticket, request.content());
        MessageResponse response = new MessageResponse(
                message.getId(),
                message.getTicket().getId(),
                message.getSenderType(),
                message.getMessageType(),
                message.getContent(),
                message.getSentAt()
        );
        return ResponseEntity.ok(response);
    }
}
