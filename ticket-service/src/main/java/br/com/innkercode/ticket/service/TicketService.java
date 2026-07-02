package br.com.innkercode.ticket.service;

import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.model.Sector;
import br.com.innkercode.ticket.domain.model.TicketStatus;
import br.com.innkercode.ticket.domain.repository.TicketRepository;
import br.com.innkercode.ticket.event.TicketEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final TicketEventPublisher eventPublisher;

    public List<Ticket> getTickets(List<TicketStatus> statuses, Sector sector, UUID assignedAgentId) {
        log.info("Buscando tickets filtrados por statuses: {}, sector: {}, assignedAgentId: {}", statuses, sector, assignedAgentId);
        return ticketRepository.findAll((root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();

            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get("status").in(statuses));
            }
            if (sector != null) {
                predicates.add(cb.equal(root.get("sector"), sector));
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
    public Ticket createTriageTicket(String whatsappNumber, String clientName) {
        log.info("Criando ticket de triagem para o número: {}", whatsappNumber);
        Ticket ticket = Ticket.builder()
                .whatsappNumber(whatsappNumber)
                .clientName(clientName)
                .status(TicketStatus.TRIAGEM)
                .build();
        Ticket savedTicket = ticketRepository.save(ticket);
        eventPublisher.publish("TICKET_CREATED", savedTicket.getId().toString(), savedTicket);
        return savedTicket;
    }

    @Transactional
    public Ticket updateSector(UUID ticketId, Sector sector) {
        log.info("Atualizando sector do ticket {} para {}", ticketId, sector);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket não encontrado com o ID: " + ticketId));

        ticket.setSector(sector);
        ticket.setStatus(TicketStatus.AGUARDANDO_ATENDIMENTO);
        ticket.setUpdatedAt(LocalDateTime.now());

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

        ticket.setAssignedAgentId(agentId);
        ticket.setStatus(TicketStatus.EM_ANDAMENTO);
        ticket.setUpdatedAt(LocalDateTime.now());

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
        ticket.setUpdatedAt(LocalDateTime.now());

        Ticket updatedTicket = ticketRepository.save(ticket);
        eventPublisher.publish("TICKET_RESOLVED", updatedTicket.getId().toString(), updatedTicket);
        return updatedTicket;
    }

    public Ticket getTicketById(UUID ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket não encontrado com o ID: " + ticketId));
    }
}
