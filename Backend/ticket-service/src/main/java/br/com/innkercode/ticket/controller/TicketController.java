package br.com.innkercode.ticket.controller;

import br.com.innkercode.ticket.domain.entity.Message;
import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.model.TicketStatus;
import br.com.innkercode.ticket.dto.DashboardSlaMetricsResponse;
import br.com.innkercode.ticket.dto.MessageResponse;
import br.com.innkercode.ticket.dto.SendMessageRequest;
import br.com.innkercode.ticket.dto.TransferTicketRequest;
import br.com.innkercode.ticket.dto.CreateTicketRequest;
import br.com.innkercode.ticket.service.MessageService;
import br.com.innkercode.ticket.service.TicketService;
import br.com.innkercode.ticket.service.SlaMetricsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
@Slf4j
public class TicketController {

    private final TicketService ticketService;
    private final MessageService messageService;
    private final SlaMetricsService slaMetricsService;

    @GetMapping
    public ResponseEntity<List<Ticket>> listTickets(
            @RequestParam(required = false) List<TicketStatus> status,
            @RequestParam(required = false) UUID sectorId,
            @RequestParam(required = false) UUID assignedAgentId
    ) {
        log.info("Listando tickets com filtros - status: {}, sectorId: {}, assignedAgentId: {}", status, sectorId, assignedAgentId);
        List<Ticket> tickets = ticketService.getTickets(status, sectorId, assignedAgentId);
        return ResponseEntity.ok(tickets);
    }

    @PostMapping
    public ResponseEntity<Ticket> createTicket(
            @RequestBody CreateTicketRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userIdStr
    ) {
        log.info("Recebida requisição para criar ticket de forma ativa. Solicitante ID: {}", userIdStr);
        if (userIdStr == null || userIdStr.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        UUID agentId = UUID.fromString(userIdStr);
        Ticket ticket = ticketService.createOutboundTicket(
                request.whatsappNumber(), 
                request.clientName(), 
                request.sectorId(), 
                agentId
        );
        return ResponseEntity.ok(ticket);
    }

    @GetMapping("/history")
    public ResponseEntity<Page<Ticket>> getHistory(
            @RequestParam(required = false) List<TicketStatus> status,
            @RequestParam(required = false) UUID sectorId,
            @RequestParam(required = false) UUID assignedAgentId,
            @RequestParam(required = false) String clientQuery,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestHeader(value = "X-User-Id", required = false) String userIdStr,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        log.info("Recebida requisição de histórico por usuário ID: {}, Role: {}", userIdStr, userRole);
        
        UUID targetAgentId = assignedAgentId;
        if ("USER".equalsIgnoreCase(userRole)) {
            if (userIdStr == null || userIdStr.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            targetAgentId = UUID.fromString(userIdStr);
        }
        
        Page<Ticket> result = ticketService.getHistoryTickets(
                status,
                sectorId,
                targetAgentId,
                clientQuery,
                startDate,
                endDate,
                page,
                size
        );
        return ResponseEntity.ok(result);
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

    @PostMapping("/{id}/transfer")
    public ResponseEntity<Ticket> transferTicket(
            @PathVariable UUID id,
            @RequestBody TransferTicketRequest request
    ) {
        log.info("Recebida requisição para transferir ticket {}", id);
        Ticket ticket = ticketService.transferTicket(id, request.targetSectorId(), request.targetAgentId());
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

    @PostMapping(value = "/{id}/messages/media", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MessageResponse> sendOperatorMediaMessage(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption
    ) throws java.io.IOException {
        log.info("Recebida requisição de resposta humana com mídia para o ticket {}", id);
        Ticket ticket = ticketService.getTicketById(id);
        
        Message message = messageService.sendOperatorMediaMessage(
                ticket, 
                file.getBytes(), 
                file.getOriginalFilename(), 
                file.getContentType(), 
                caption
        );
        
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

    @GetMapping("/sla-metrics")
    public ResponseEntity<DashboardSlaMetricsResponse> getSlaMetrics(
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        log.info("Recebida requisição para recuperar métricas de SLA. Solicitante role: {}", userRole);
        if (!"MASTER".equals(userRole) && !"ADMIN".equals(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        DashboardSlaMetricsResponse metrics = slaMetricsService.getDashboardSlaMetrics();
        return ResponseEntity.ok(metrics);
    }
}
