package br.com.innkercode.ticket.service;

import br.com.innkercode.ticket.client.EvolutionClient;
import br.com.innkercode.ticket.domain.entity.Ticket;
import br.com.innkercode.ticket.domain.model.MessageType;
import br.com.innkercode.ticket.domain.model.Sector;
import br.com.innkercode.ticket.domain.model.SenderType;
import br.com.innkercode.ticket.domain.model.TicketStatus;
import br.com.innkercode.ticket.dto.webhook.WebhookPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotService {

    private final TicketService ticketService;
    private final MessageService messageService;
    private final EvolutionClient evolutionClient;
    private final S3Service s3Service;

    @Value("${whatsapp.evolution.apikey}")
    private String apiKey;

    private final RestClient restClient = RestClient.create();

    public void processIncomingWebhook(WebhookPayload payload) {
        if (payload == null || payload.getData() == null || payload.getData().getKey() == null) {
            log.warn("Payload de webhook inválido recebido.");
            return;
        }

        // Ignorar mensagens enviadas pela própria API (evita loops)
        if (payload.getData().getKey().isFromMe()) {
            log.debug("Ignorando mensagem enviada pela própria API (fromMe = true).");
            return;
        }

        String event = payload.getEvent();
        if (!"messages.upsert".equals(event)) {
            log.debug("Ignorando evento de webhook não suportado: {}", event);
            return;
        }

        String senderNumber = payload.getSender();
        if (senderNumber == null || senderNumber.isBlank()) {
            log.warn("Mensagem sem número de remetente.");
            return;
        }

        // Determinar o tipo da mensagem e conteúdo
        MessageType messageType = MessageType.TEXTO;
        String content = extractTextContent(payload.getData().getMessage());

        // Verificar se é uma mensagem de mídia
        String mediaUrl = handleMediaMessage(payload.getData().getMessage());
        if (mediaUrl != null) {
            content = mediaUrl;
            messageType = determineMessageType(payload.getData().getMessage());
        }

        if (content == null || content.isBlank()) {
            log.info("Mensagem recebida sem conteúdo de texto direto e sem mídia válida.");
            content = "[Mensagem não suportada]";
        }

        String clientName = payload.getData().getPushName();

        // Buscar ticket ativo para o número
        Optional<Ticket> activeTicketOpt = ticketService.getActiveTicketByWhatsappNumber(senderNumber);

        if (activeTicketOpt.isEmpty()) {
            // Criar novo ticket de triagem e enviar menu inicial
            Ticket ticket = ticketService.createTriageTicket(senderNumber, clientName);
            messageService.saveMessage(ticket, SenderType.CLIENTE, messageType, content);

            sendTriageMenu(senderNumber);
        } else {
            Ticket ticket = activeTicketOpt.get();
            messageService.saveMessage(ticket, SenderType.CLIENTE, messageType, content);

            if (ticket.getStatus() == TicketStatus.TRIAGEM) {
                // Durante a triagem, se for texto, processamos a opção de menu
                if (messageType == MessageType.TEXTO) {
                    handleTriageInput(ticket, content);
                } else {
                    // Envia mensagem de erro indicando que apenas opções de texto são válidas durante a triagem
                    evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), 
                            "Por favor, envie o número correspondente à sua opção em formato de texto para direcionarmos seu contato.");
                }
            } else {
                log.info("Ticket {} ativo em status {}, mensagem de tipo {} recebida.", ticket.getId(), ticket.getStatus(), messageType);
            }
        }
    }

    private String extractTextContent(WebhookPayload.WebhookMessage msg) {
        if (msg == null) return null;
        if (msg.getConversation() != null) {
            return msg.getConversation();
        }
        if (msg.getExtendedTextMessage() != null && msg.getExtendedTextMessage().getText() != null) {
            return msg.getExtendedTextMessage().getText();
        }
        return null;
    }

    private MessageType determineMessageType(WebhookPayload.WebhookMessage msg) {
        if (msg == null) return MessageType.TEXTO;
        if (msg.getImageMessage() != null) return MessageType.IMAGEM;
        if (msg.getAudioMessage() != null || msg.getVideoMessage() != null || msg.getDocumentMessage() != null) {
            return MessageType.DOCUMENTO;
        }
        return MessageType.TEXTO;
    }

    private String handleMediaMessage(WebhookPayload.WebhookMessage msg) {
        if (msg == null) return null;

        WebhookPayload.MediaMessage media = null;
        if (msg.getImageMessage() != null) {
            media = msg.getImageMessage();
        } else if (msg.getAudioMessage() != null) {
            media = msg.getAudioMessage();
        } else if (msg.getVideoMessage() != null) {
            media = msg.getVideoMessage();
        } else if (msg.getDocumentMessage() != null) {
            media = msg.getDocumentMessage();
        }

        if (media == null || media.getUrl() == null) {
            return null;
        }

        try {
            log.info("Baixando mídia temporária do WhatsApp Gateway: {}", media.getUrl());
            byte[] fileBytes = restClient.get()
                    .uri(media.getUrl())
                    .header("apikey", apiKey)
                    .retrieve()
                    .body(byte[].class);

            if (fileBytes != null && fileBytes.length > 0) {
                String originalFilename = media.getFileName() != null ? media.getFileName() : "media_" + UUID.randomUUID();
                String contentType = media.getMimetype() != null ? media.getMimetype() : "application/octet-stream";

                // Envia para o MinIO S3
                return s3Service.uploadFile(originalFilename, fileBytes, contentType);
            }
        } catch (Exception e) {
            log.error("Erro ao transferir mídia do gateway para o MinIO S3", e);
        }
        return null;
    }

    private void sendTriageMenu(String whatsappNumber) {
        String menu = "Olá! Para iniciarmos seu atendimento, escolha uma das opções abaixo:\n" +
                "1 - Fiscal\n" +
                "2 - DP (Departamento Pessoal)\n" +
                "3 - Contábil\n" +
                "4 - Societário";
        evolutionClient.sendTextMessage(whatsappNumber, menu);
    }

    private void handleTriageInput(Ticket ticket, String input) {
        String cleanInput = input.trim();
        Sector selectedSector = null;

        if ("1".equals(cleanInput)) {
            selectedSector = Sector.FISCAL;
        } else if ("2".equals(cleanInput)) {
            selectedSector = Sector.DEPARTAMENTO_PESSOAL;
        } else if ("3".equals(cleanInput)) {
            selectedSector = Sector.CONTABIL;
        } else if ("4".equals(cleanInput)) {
            selectedSector = Sector.SOCIETARIO;
        }

        if (selectedSector != null) {
            ticketService.updateSector(ticket.getId(), selectedSector);

            String friendlyName = getSectorFriendlyName(selectedSector);
            String confirmationMessage = String.format(
                    "Entendi! Você foi encaminhado para o setor de %s. Aguarde que logo um atendente irá falar com você.",
                    friendlyName
            );
            evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), confirmationMessage);
        } else {
            // Opção inválida, envia novamente o menu
            String invalidMessage = "Opção inválida. Por favor digite o número correspondente ao setor desejado:\n" +
                    "1 - Fiscal\n" +
                    "2 - DP (Departamento Pessoal)\n" +
                    "3 - Contábil\n" +
                    "4 - Societário";
            evolutionClient.sendTextMessage(ticket.getWhatsappNumber(), invalidMessage);
        }
    }

    private String getSectorFriendlyName(Sector sector) {
        return switch (sector) {
            case FISCAL -> "Fiscal";
            case DEPARTAMENTO_PESSOAL -> "DP (Departamento Pessoal)";
            case CONTABIL -> "Contábil";
            case SOCIETARIO -> "Societário";
        };
    }
}
