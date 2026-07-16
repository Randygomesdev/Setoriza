package br.com.innkercode.ticket.service;

import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.entity.Sector;
import br.com.innkercode.ticket.domain.model.TicketStatus;
import br.com.innkercode.ticket.domain.model.SenderType;
import br.com.innkercode.ticket.domain.model.MessageType;
import br.com.innkercode.ticket.domain.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AutoCloseScheduler {

    private final TicketRepository ticketRepository;
    private final TicketService ticketService;
    private final MessageService messageService;
    private final WhatsAppGatewayService whatsAppGatewayService;

    @Scheduled(cron = "0 */1 * * * *") // Roda a cada 1 minuto
    @Transactional
    public void processAutoClose() {
        log.debug("Iniciando varredura para encerramento automático por inatividade.");
        List<Ticket> activeTickets = ticketRepository.findByStatus(TicketStatus.EM_ANDAMENTO);
        if (activeTickets.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        for (Ticket ticket : activeTickets) {
            Sector sector = ticket.getSector();
            if (sector == null || !sector.isAutoCloseEnabled()) {
                continue;
            }

            // A inatividade conta a partir da última mensagem (updatedAt) ou fallback de início
            LocalDateTime lastActivityTime = ticket.getUpdatedAt() != null ? ticket.getUpdatedAt() : ticket.getClaimedAt();
            if (lastActivityTime == null) {
                lastActivityTime = ticket.getCreatedAt();
            }
            if (lastActivityTime == null) {
                continue;
            }

            long inactivityMinutes = java.time.Duration.between(lastActivityTime, now).toMinutes();

            // Cenário A: Tempo limite de encerramento atingido
            if (inactivityMinutes >= sector.getAutoCloseTimeoutMinutes()) {
                log.info("Ticket {} (WhatsApp: {}) inativo por {} minutos. Encerrando automaticamente.", 
                        ticket.getId(), ticket.getWhatsappNumber(), inactivityMinutes);
                
                String closeMessage = "Atendimento encerrado automaticamente devido à inatividade.";
                
                // Salva a mensagem no histórico como SISTEMA
                messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, closeMessage);

                // Dispara no WhatsApp via Gateway Service
                try {
                    whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), closeMessage);
                } catch (Exception e) {
                    log.error("Erro ao enviar mensagem de encerramento via WhatsApp para o ticket {}: {}", ticket.getId(), e.getMessage());
                }

                // Resolve o chamado no banco
                ticketService.resolveTicket(ticket.getId());
                continue;
            }

            // Cenário B: Tempo de alerta atingido e aviso ainda não enviado
            if (inactivityMinutes >= sector.getAutoCloseWarningMinutes() && !ticket.isAutoCloseWarningSent()) {
                log.info("Ticket {} (WhatsApp: {}) inativo por {} minutos. Enviando aviso prévio de inatividade.", 
                        ticket.getId(), ticket.getWhatsappNumber(), inactivityMinutes);

                String warningMessage = sector.getAutoCloseWarningMessage();
                if (warningMessage == null || warningMessage.isBlank()) {
                    warningMessage = "Olá! Notamos que você não respondeu há algum tempo. Para manter nossa fila organizada, este atendimento será encerrado automaticamente em breve caso não haja retorno.";
                }

                // Salva a mensagem no histórico como SISTEMA
                messageService.saveMessage(ticket, SenderType.SISTEMA, MessageType.TEXTO, warningMessage);

                // Dispara no WhatsApp via Gateway Service
                try {
                    whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), warningMessage);
                } catch (Exception e) {
                    log.error("Erro ao enviar mensagem de aviso via WhatsApp para o ticket {}: {}", ticket.getId(), e.getMessage());
                }

                // Marca flag de aviso enviado
                ticket.setAutoCloseWarningSent(true);
                ticketRepository.save(ticket);
            }
        }
    }
}
