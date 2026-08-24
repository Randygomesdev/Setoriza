package br.com.innkercode.ticket.service;

import br.com.innkercode.ticket.domain.entity.Message;
import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.model.MessageType;
import br.com.innkercode.ticket.domain.model.SenderType;
import br.com.innkercode.ticket.domain.repository.MessageRepository;
import br.com.innkercode.ticket.domain.repository.TicketRepository;
import br.com.innkercode.ticket.event.TicketEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.innkercode.ticket.util.ImageCompressor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final TicketRepository ticketRepository;
    private final TicketEventPublisher eventPublisher;
    private final WhatsAppGatewayService whatsAppGatewayService;
    private final S3Service s3Service;

    public List<Message> getMessagesByTicketId(UUID ticketId) {
        return messageRepository.findByTicketIdOrderBySentAtAsc(ticketId);
    }

    @Transactional
    public Message saveMessage(Ticket ticket, SenderType senderType, MessageType messageType, String content) {
        return saveMessage(ticket, senderType, messageType, content, null);
    }

    @Transactional
    public Message saveMessage(Ticket ticket, SenderType senderType, MessageType messageType, String content, String whatsappMsgId) {
        log.info("Salvando mensagem para o ticket: {}. Remetente: {}, Tipo: {}, ID: {}", ticket.getId(), senderType, messageType, whatsappMsgId);
        
        if (senderType == SenderType.CLIENTE || senderType == SenderType.COLABORADOR) {
            ticket.setAutoCloseWarningSent(false);
            ticket.setUpdatedAt(LocalDateTime.now());
            ticketRepository.save(ticket);
        }

        Message message = Message.builder()
                .ticket(ticket)
                .senderType(senderType)
                .messageType(messageType)
                .content(content)
                .whatsappMsgId(whatsappMsgId)
                .status("SENT")
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
        
        // 2. Dispara a mensagem para o cliente via Gateway Service
        String whatsappMsgId = whatsAppGatewayService.sendTextMessage(ticket.getWhatsappNumber(), content);
        if (whatsappMsgId != null) {
            savedMessage.setWhatsappMsgId(whatsappMsgId);
            savedMessage = messageRepository.save(savedMessage);
        }
        
        // 3. Publica evento de envio de resposta humana
        eventPublisher.publish("MESSAGE_SENT_BY_AGENT", ticket.getId().toString(), savedMessage);

        return savedMessage;
    }

    @Transactional
    public Message sendOperatorMediaMessage(Ticket ticket, byte[] fileBytes, String originalFilename, String contentType, String caption) {
        log.info("Processando envio de resposta humana com mídia para o ticket: {} - {}", ticket.getId(), ticket.getWhatsappNumber());
        
        // Compactar imagem se for compatível (JPEG/PNG)
        byte[] processedBytes = ImageCompressor.compressImage(fileBytes, contentType);
        String processedFilename = ImageCompressor.getNewFilename(originalFilename);
        String processedContentType = ImageCompressor.getNewContentType(contentType);
        
        // 1. Fazer upload do arquivo para o S3
        String s3Url = s3Service.uploadFile(processedFilename, processedBytes, processedContentType);
        
        // 2. Determinar o tipo da mensagem
        MessageType messageType = MessageType.DOCUMENTO;
        if (processedContentType != null && processedContentType.startsWith("image/")) {
            messageType = MessageType.IMAGEM;
        }
        
        // 3. Salvar a mensagem no banco local como COLABORADOR
        Message savedMessage = saveMessage(ticket, SenderType.COLABORADOR, messageType, s3Url);
        
        // 4. Determinar o mediatype para a Evolution API
        String mediatype = "document";
        if (processedContentType != null) {
            if (processedContentType.startsWith("image/")) {
                mediatype = "image";
            } else if (
                processedContentType.startsWith("audio/") || 
                (processedFilename != null && processedFilename.toLowerCase().contains("voice_message")) ||
                (processedFilename != null && processedFilename.toLowerCase().endsWith(".webm")) ||
                (processedFilename != null && processedFilename.toLowerCase().endsWith(".ogg")) ||
                (processedFilename != null && processedFilename.toLowerCase().endsWith(".opus"))
            ) {
                mediatype = "audio";
            } else if (processedContentType.startsWith("video/")) {
                mediatype = "video";
            }
        }
        
        // 5. Dispara a mensagem para o cliente via Gateway Service
        String whatsappMsgId;
        if ("audio".equals(mediatype)) {
            whatsappMsgId = whatsAppGatewayService.sendWhatsAppAudio(ticket.getWhatsappNumber(), s3Url);
        } else {
            whatsappMsgId = whatsAppGatewayService.sendMediaMessage(
                    ticket.getWhatsappNumber(), 
                    s3Url, 
                    mediatype, 
                    processedContentType, 
                    processedFilename, 
                    caption
            );
        }
        if (whatsappMsgId != null) {
            savedMessage.setWhatsappMsgId(whatsappMsgId);
            savedMessage = messageRepository.save(savedMessage);
        }
        
        // 6. Publica evento de envio de resposta humana
        eventPublisher.publish("MESSAGE_SENT_BY_AGENT", ticket.getId().toString(), savedMessage);

        return savedMessage;
    }

    @Transactional
    public Message updateMessageStatus(String whatsappMsgId, String status) {
        log.info("Atualizando status da mensagem: {} para {}", whatsappMsgId, status);
        java.util.Optional<Message> messageOpt = messageRepository.findByWhatsappMsgId(whatsappMsgId);
        if (messageOpt.isPresent()) {
            Message message = messageOpt.get();
            message.setStatus(status);
            Message saved = messageRepository.save(message);
            eventPublisher.publish("MESSAGE_STATUS_UPDATED", message.getTicket().getId().toString(), saved);
            return saved;
        }
        return null;
    }

    @Transactional
    public Message updateEditedMessage(String whatsappMsgId, String newContent) {
        log.info("Processando edição de mensagem: whatsappMsgId = {}, novo conteúdo = {}", whatsappMsgId, newContent);
        java.util.Optional<Message> messageOpt = messageRepository.findByWhatsappMsgId(whatsappMsgId);
        if (messageOpt.isPresent()) {
            Message message = messageOpt.get();
            message.setContent(newContent);
            Message saved = messageRepository.save(message);
            eventPublisher.publish("MESSAGE_RECEIVED", message.getTicket().getId().toString(), saved);
            return saved;
        }
        return null;
    }

    @Transactional(readOnly = true)
    public boolean hasSystemMessage(UUID ticketId) {
        return messageRepository.existsByTicketIdAndSenderType(ticketId, SenderType.SISTEMA);
    }

    @Transactional(readOnly = true)
    public boolean hasTriageMenuBeenSent(UUID ticketId) {
        return messageRepository.findByTicketIdOrderBySentAtAsc(ticketId).stream()
                .anyMatch(m -> m.getSenderType() == SenderType.SISTEMA 
                        && m.getContent() != null 
                        && (m.getContent().contains("escolha uma das opções") || m.getContent().contains("Encaminhei o seu contato") || m.getContent().contains("Opção inválida")));
    }
}
