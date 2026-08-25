package br.com.innkercode.ticket.service;

import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.entity.Sector;
import br.com.innkercode.ticket.domain.entity.TicketSectorHistory;
import br.com.innkercode.ticket.domain.model.TicketStatus;
import br.com.innkercode.ticket.domain.model.SenderType;
import br.com.innkercode.ticket.domain.model.MessageType;
import br.com.innkercode.ticket.domain.repository.TicketRepository;
import br.com.innkercode.ticket.domain.repository.SectorRepository;
import br.com.innkercode.ticket.domain.repository.TicketSectorHistoryRepository;
import br.com.innkercode.ticket.domain.repository.ClientContactRepository;
import br.com.innkercode.ticket.domain.entity.ClientContact;
import br.com.innkercode.ticket.event.TicketEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private final TicketRepository ticketRepository;
    private final SectorRepository sectorRepository;
    private final TicketSectorHistoryRepository ticketSectorHistoryRepository;
    private final TicketEventPublisher eventPublisher;
    private final ClientContactRepository clientContactRepository;
    private final MessageService messageService;

    public List<Ticket> getTickets(List<TicketStatus> statuses, UUID sectorId, UUID assignedAgentId) {
        log.info("Buscando tickets filtrados por statuses: {}, sectorId: {}, assignedAgentId: {}", statuses, sectorId, assignedAgentId);
        return ticketRepository.findAll((root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();

            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get("status").in(statuses));
            }
            if (sectorId != null) {
                predicates.add(cb.equal(root.get("sector").get("id"), sectorId));
            }
            if (assignedAgentId != null) {
                predicates.add(cb.equal(root.get("assignedAgentId"), assignedAgentId));
            }

            query.orderBy(cb.desc(root.get("createdAt")));
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        });
    }

    public Optional<Ticket> getActiveTicketByWhatsappNumber(String whatsappNumber) {
        return ticketRepository.findFirstByWhatsappNumberAndStatusNotOrderByCreatedAtDesc(whatsappNumber, TicketStatus.CONCLUIDO);
    }

    @Transactional
    public Ticket createTriageTicket(String whatsappNumber, String clientName, UUID clientId) {
        log.info("Criando ticket de triagem para o número: {} (Cliente: {})", whatsappNumber, clientId);
        Ticket ticket = Ticket.builder()
                .whatsappNumber(whatsappNumber)
                .clientName(clientName)
                .clientId(clientId)
                .status(TicketStatus.TRIAGEM)
                .build();
        Ticket savedTicket = ticketRepository.save(ticket);
        eventPublisher.publish("TICKET_CREATED", savedTicket.getId().toString(), savedTicket);
        return savedTicket;
    }

    @Transactional
    public Ticket createIdentificationTicket(String whatsappNumber, String clientName) {
        log.info("Criando ticket de identificação para o número: {}", whatsappNumber);
        Ticket ticket = Ticket.builder()
                .whatsappNumber(whatsappNumber)
                .clientName(clientName)
                .status(TicketStatus.IDENTIFICACAO_CNPJ)
                .build();
        Ticket savedTicket = ticketRepository.save(ticket);
        eventPublisher.publish("TICKET_CREATED", savedTicket.getId().toString(), savedTicket);
        return savedTicket;
    }

    @Transactional
    public Ticket updateSector(UUID ticketId, Sector sector) {
        log.info("Atualizando sector do ticket {} para {}", ticketId, sector.getName());
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket não encontrado com o ID: " + ticketId));

        ticket.setSector(sector);
        ticket.setStatus(TicketStatus.AGUARDANDO_ATENDIMENTO);
        if (ticket.getQueuedAt() == null) {
            ticket.setQueuedAt(LocalDateTime.now());
        }
        ticket.setUpdatedAt(LocalDateTime.now());

        // Fecha qualquer histórico ativo anterior, se houver
        ticketSectorHistoryRepository.findFirstByTicketIdAndExitedAtIsNull(ticketId)
                .ifPresent(activeHistory -> {
                    activeHistory.setExitedAt(LocalDateTime.now());
                    ticketSectorHistoryRepository.save(activeHistory);
                });

        // Cria nova entrada no histórico do setor
        TicketSectorHistory newHistory = TicketSectorHistory.builder()
                .ticket(ticket)
                .sector(sector)
                .enteredAt(LocalDateTime.now())
                .slaLimitMinutes(sector.getSlaLimitMinutes())
                .build();
        ticketSectorHistoryRepository.save(newHistory);

        Ticket updatedTicket = ticketRepository.save(ticket);
        log.info("Ticket {} atualizado com sucesso. Status: {}", ticketId, updatedTicket.getStatus());
        eventPublisher.publish("TICKET_UPDATED", updatedTicket.getId().toString(), updatedTicket);
        return updatedTicket;
    }

    @Transactional
    public Ticket assignAgent(UUID ticketId, UUID agentId) {
        log.info("Atribuindo atendente {} ao ticket {}", agentId, ticketId);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket não encontrado com o ID: " + ticketId));

        if (ticket.getStatus() == TicketStatus.CONCLUIDO) {
            if (ticket.getResolvedAt() != null && ticket.getResolvedAt().isBefore(LocalDateTime.now().minusHours(24))) {
                throw new IllegalStateException("Este chamado foi concluído há mais de 24 horas e não pode ser reaberto.");
            }
        }

        ticket.setAssignedAgentId(agentId);
        ticket.setStatus(TicketStatus.EM_ANDAMENTO);
        if (ticket.getClaimedAt() == null) {
            ticket.setClaimedAt(LocalDateTime.now());
        }
        ticket.setUpdatedAt(LocalDateTime.now());

        // Atualiza histórico ativo do setor
        ticketSectorHistoryRepository.findFirstByTicketIdAndExitedAtIsNull(ticketId)
                .ifPresent(activeHistory -> {
                    activeHistory.setAssignedAgentId(agentId);
                    if (activeHistory.getClaimedAt() == null) {
                        activeHistory.setClaimedAt(LocalDateTime.now());
                    }
                    ticketSectorHistoryRepository.save(activeHistory);
                });

        Ticket updatedTicket = ticketRepository.save(ticket);
        eventPublisher.publish("TICKET_CLAIMED", updatedTicket.getId().toString(), updatedTicket);
        return updatedTicket;
    }

    @Transactional
    public Ticket resolveTicket(UUID ticketId) {
        log.info("Concluindo ticket {}", ticketId);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket não encontrado com o ID: " + ticketId));

        ticket.setStatus(TicketStatus.CONCLUIDO);
        ticket.setResolvedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());

        // Atualiza histórico ativo
        ticketSectorHistoryRepository.findFirstByTicketIdAndExitedAtIsNull(ticketId)
                .ifPresent(activeHistory -> {
                    activeHistory.setExitedAt(LocalDateTime.now());
                    activeHistory.setResolvedAt(LocalDateTime.now());
                    ticketSectorHistoryRepository.save(activeHistory);
                });

        Ticket updatedTicket = ticketRepository.save(ticket);
        eventPublisher.publish("TICKET_RESOLVED", updatedTicket.getId().toString(), updatedTicket);
        return updatedTicket;
    }

    @Transactional
    public Ticket promoteToTriage(UUID ticketId, UUID clientId) {
        log.info("Promovendo ticket {} para TRIAGEM com cliente {}", ticketId, clientId);
        Ticket ticket = getTicketById(ticketId);
        ticket.setClientId(clientId);
        ticket.setStatus(TicketStatus.TRIAGEM);
        ticket.setUpdatedAt(LocalDateTime.now());
        Ticket savedTicket = ticketRepository.save(ticket);
        eventPublisher.publish("TICKET_UPDATED", savedTicket.getId().toString(), savedTicket);
        return savedTicket;
    }

    @Transactional
    public Ticket transferTicket(UUID ticketId, UUID targetSectorId, UUID targetAgentId, String targetAgentName) {
        log.info("Transferindo ticket {} - Novo setor: {}, Novo atendente: {}, Nome atendente: {}", 
                 ticketId, targetSectorId, targetAgentId, targetAgentName);
        Ticket ticket = getTicketById(ticketId);

        // Fecha histórico ativo anterior
        ticketSectorHistoryRepository.findFirstByTicketIdAndExitedAtIsNull(ticketId)
                .ifPresent(activeHistory -> {
                    activeHistory.setExitedAt(LocalDateTime.now());
                    ticketSectorHistoryRepository.save(activeHistory);
                });

        String systemMessageText = "";

        if (targetSectorId != null) {
            Sector sector = sectorRepository.findById(targetSectorId)
                    .orElseThrow(() -> new IllegalArgumentException("Setor de destino não encontrado"));
            ticket.setSector(sector);
            
            if (targetAgentId == null) {
                // Se transferiu para o setor sem atendente específico, volta para a fila
                ticket.setAssignedAgentId(null);
                ticket.setStatus(TicketStatus.AGUARDANDO_ATENDIMENTO);
                systemMessageText = "Chamado transferido para a fila do setor: " + sector.getFriendlyName();
            } else {
                ticket.setAssignedAgentId(targetAgentId);
                ticket.setStatus(TicketStatus.EM_ANDAMENTO);
                String agentLabel = (targetAgentName != null && !targetAgentName.isBlank()) ? targetAgentName : "Atendente";
                systemMessageText = "Chamado transferido para o setor " + sector.getFriendlyName() + " aos cuidados de " + agentLabel;
            }

            // Cria novo histórico para o novo setor
            TicketSectorHistory newHistory = TicketSectorHistory.builder()
                    .ticket(ticket)
                    .sector(sector)
                    .assignedAgentId(targetAgentId)
                    .enteredAt(LocalDateTime.now())
                    .claimedAt(targetAgentId != null ? LocalDateTime.now() : null)
                    .slaLimitMinutes(sector.getSlaLimitMinutes())
                    .build();
            ticketSectorHistoryRepository.save(newHistory);
        } else if (targetAgentId != null) {
            // Permanece no mesmo setor, apenas altera o atendente
            ticket.setAssignedAgentId(targetAgentId);
            ticket.setStatus(TicketStatus.EM_ANDAMENTO);
            String agentLabel = (targetAgentName != null && !targetAgentName.isBlank()) ? targetAgentName : "Atendente";
            systemMessageText = "Chamado transferido para o atendente " + agentLabel;

            // Cria novo histórico para o novo atendente no mesmo setor
            TicketSectorHistory newHistory = TicketSectorHistory.builder()
                    .ticket(ticket)
                    .sector(ticket.getSector())
                    .assignedAgentId(targetAgentId)
                    .enteredAt(LocalDateTime.now())
                    .claimedAt(LocalDateTime.now())
                    .slaLimitMinutes(ticket.getSector().getSlaLimitMinutes())
                    .build();
            ticketSectorHistoryRepository.save(newHistory);
        }

        ticket.setUpdatedAt(LocalDateTime.now());
        Ticket updatedTicket = ticketRepository.save(ticket);

        // Salva a mensagem do sistema no chat se houver texto definido
        if (!systemMessageText.isEmpty()) {
            messageService.saveMessage(updatedTicket, SenderType.SISTEMA, MessageType.TEXTO, systemMessageText);
        }

        eventPublisher.publish("TICKET_UPDATED", updatedTicket.getId().toString(), updatedTicket);
        return updatedTicket;
    }

    public Ticket getTicketById(UUID ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket não encontrado com o ID: " + ticketId));
    }

    @Transactional
    public Ticket createOutboundTicket(String whatsappNumber, String clientName, UUID sectorId, UUID agentId) {
        log.info("Criando ticket ativo (Outbound) para o número: {}, setor: {}, atendente: {}", whatsappNumber, sectorId, agentId);
        
        String cleanPhone = whatsappNumber.replaceAll("\\D", "");
        if (cleanPhone.isBlank()) {
            throw new IllegalArgumentException("O número de WhatsApp é inválido.");
        }
        
        Optional<Ticket> activeTicketOpt = getActiveTicketByWhatsappNumber(cleanPhone);
        if (activeTicketOpt.isPresent()) {
            throw new IllegalStateException("Já existe um atendimento ativo para este número de WhatsApp.");
        }
        
        Sector sector = sectorRepository.findById(sectorId)
                .orElseThrow(() -> new IllegalArgumentException("Setor de destino não encontrado"));
                
        UUID clientId = null;
        String resolvedName = clientName;
        
        Optional<ClientContact> contactOpt = clientContactRepository.findByWhatsappNumber(cleanPhone);
        if (contactOpt.isPresent()) {
            ClientContact contact = contactOpt.get();
            clientId = contact.getClient().getId();
            resolvedName = contact.getContactName();
        }
        
        Ticket ticket = Ticket.builder()
                .whatsappNumber(cleanPhone)
                .clientName(resolvedName)
                .clientId(clientId)
                .sector(sector)
                .status(TicketStatus.EM_ANDAMENTO)
                .assignedAgentId(agentId)
                .queuedAt(LocalDateTime.now())
                .claimedAt(LocalDateTime.now())
                .build();
                
        Ticket savedTicket = ticketRepository.save(ticket);
        
        TicketSectorHistory history = TicketSectorHistory.builder()
                .ticket(savedTicket)
                .sector(sector)
                .assignedAgentId(agentId)
                .enteredAt(LocalDateTime.now())
                .claimedAt(LocalDateTime.now())
                .slaLimitMinutes(sector.getSlaLimitMinutes())
                .build();
        ticketSectorHistoryRepository.save(history);
        
        eventPublisher.publish("TICKET_CREATED", savedTicket.getId().toString(), savedTicket);
        return savedTicket;
    }

    public Page<Ticket> getHistoryTickets(
            List<TicketStatus> statuses,
            UUID sectorId,
            UUID assignedAgentId,
            String clientQuery,
            LocalDateTime startDate,
            LocalDateTime endDate,
            int page,
            int size
    ) {
        log.info("Buscando histórico de tickets - Page: {}, Size: {}, clientQuery: {}, startDate: {}, endDate: {}", 
                page, size, clientQuery, startDate, endDate);
                
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        Specification<Ticket> spec = (root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            
            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get("status").in(statuses));
            }
            if (sectorId != null) {
                predicates.add(cb.equal(root.get("sector").get("id"), sectorId));
            }
            if (assignedAgentId != null) {
                predicates.add(cb.equal(root.get("assignedAgentId"), assignedAgentId));
            }
            if (clientQuery != null && !clientQuery.isBlank()) {
                String cleanQuery = "%" + clientQuery.toLowerCase() + "%";
                var namePredicate = cb.like(cb.lower(root.get("clientName")), cleanQuery);
                var phonePredicate = cb.like(root.get("whatsappNumber"), cleanQuery);
                predicates.add(cb.or(namePredicate, phonePredicate));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
            }
            
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        
        return ticketRepository.findAll(spec, pageable);
    }

    public List<TicketSectorHistory> getTicketSectorHistory(UUID ticketId) {
        return ticketSectorHistoryRepository.findByTicketId(ticketId);
    }
}
