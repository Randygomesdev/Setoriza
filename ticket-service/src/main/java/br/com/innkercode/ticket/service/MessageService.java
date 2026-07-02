package br.com.innkercode.ticket.service;

import br.com.innkercode.ticket.domain.entity.Message;
import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.model.MessageType;
import br.com.innkercode.ticket.domain.model.SenderType;
import br.com.innkercode.ticket.domain.repository.MessageRepository;
import br.com.innkercode.ticket.event.TicketEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.innkercode.ticket.client.EvolutionClient;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final TicketEventPublisher eventPublisher;
    private final EvolutionClient evolutionClient;

    public List<Message> getMessagesByTicketId(UUID ticketId) {
        return messageRepository.findByTicketIdOrderBySentAtAsc(ticketId);
    }

    @Transactional
    public Message saveMessage(Ticket ticket, SenderType senderType, MessageType messageType, String content) {
        log.info("Salvando mensagem para o ticket: {}. Remetente: {}, Tipo: {}", ticket.getId(), senderType, messageType);
        Message message = Message.builder()
                .ticket(ticket)
                .senderType(senderType)
                .messageType(messageType)
                .content(content)
                .sentAt(LocalDateTime.now())
                .build();
        Message savedMessage = messageRepository.save(message);
        eventPublisher.publish("MESSAGE_RECEIVED", ticket.getId().toString(), savedMessage);
        return savedMessage;
    }

    @Transactional
    public Message sendOperatorMessage(Ticket ticket, String content) {
        log.info("Processando envio de resposta humana para o ticket: {} - {}", ticket.getId(), ticket.getWhatsappNumber());
        // 1. Salva a mensagem no banco local como COLABORADOR
        Message savedMessage = saveMessage(ticket, SenderType.COLABORADOR, MessageType.TEXTO, content);
        
        // 2. Dispara a mensagem para o cliente via Evolution API
        evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), content);
        
        // 3. Publica evento de envio de resposta humana
        eventPublisher.publish("MESSAGE_SENT_BY_AGENT", ticket.getId().toString(), savedMessage);

        return savedMessage;
    }
}
