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
    private final S3Service s3Service;

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

    @Transactional
    public Message sendOperatorMediaMessage(Ticket ticket, byte[] fileBytes, String originalFilename, String contentType, String caption) {
        log.info("Processando envio de resposta humana com mídia para o ticket: {} - {}", ticket.getId(), ticket.getWhatsappNumber());
        
        // 1. Fazer upload do arquivo para o S3
        String s3Url = s3Service.uploadFile(originalFilename, fileBytes, contentType);
        
        // 2. Determinar o tipo da mensagem
        MessageType messageType = MessageType.DOCUMENTO;
        if (contentType != null && contentType.startsWith("image/")) {
            messageType = MessageType.IMAGEM;
        }
        
        // 3. Salvar a mensagem no banco local como COLABORADOR
        Message savedMessage = saveMessage(ticket, SenderType.COLABORADOR, messageType, s3Url);
        
        // 4. Determinar o mediatype para a Evolution API
        String mediatype = "document";
        if (contentType != null) {
            if (contentType.startsWith("image/")) {
                mediatype = "image";
            } else if (contentType.startsWith("video/")) {
                mediatype = "video";
            } else if (contentType.startsWith("audio/")) {
                mediatype = "audio";
            }
        }
        
        // 5. Dispara a mensagem para o cliente via Evolution API
        String base64Media = java.util.Base64.getEncoder().encodeToString(fileBytes);
        evolutionClient.sendMediaMessage(
                ticket.getWhatsappNumber(), 
                base64Media, 
                mediatype, 
                contentType, 
                originalFilename, 
                caption
        );
        
        // 6. Publica evento de envio de resposta humana
        eventPublisher.publish("MESSAGE_SENT_BY_AGENT", ticket.getId().toString(), savedMessage);

        return savedMessage;
    }
}
